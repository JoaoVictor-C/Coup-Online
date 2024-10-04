const Game = require('../models/Game');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const {
    checkGameOver,
    removeRandomCharacter,
    executeAction,
    executePendingAction,
} = require('../services/gameService');
const { setActionTimeout, clearActionTimeout } = require('../services/timerService');
const connectedUsers = {}; // To track userId to socket.id
const userGames = {}; // To track socket.id to gameId

const gameSockets = (io, socket) => {
    // Join a game room
    socket.on('joinGame', async ({ gameId, userId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate('players.playerProfile.user');
            if (!game) {
                return callback({ success: false, message: 'Game not found' });
            }

            const playerProfile = await PlayerProfile.findOne({ user: userId });
            if (!playerProfile) {
                return callback({ success: false, message: 'Player profile not found' });
            }

            const isAlreadyPlayer = game.players.some(player => player.playerProfile.toString() === playerProfile.id.toString());
            if (isAlreadyPlayer) {
                console.log('User is already in the game');
                socket.join(gameId);
                connectedUsers[userId] = socket.id;
                userGames[socket.id] = gameId;
                return callback({ success: true, message: 'User is already in the game', game: game });
            }

            if (game.status !== 'waiting') {
                return callback({ success: false, message: 'Cannot join a game that has already started' });
            }

            if (game.players.length >= game.maxPlayers) {
                return callback({ success: false, message: 'Game is already full' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return callback({ success: false, message: 'User not found' });
            }

            const characters = [game.deck.pop(), game.deck.pop()];
            game.players.push({
                playerProfile: playerProfile.id,
                username: user.username,
                coins: 2,
                characters: characters,
                isAlive: true,
                isConnected: true,
            });

            await game.save();
            await User.findByIdAndUpdate(userId, { $push: { games: game.id } });

            const populatedGame = await Game.findById(game.id)
                .populate({
                    path: 'players.playerProfile',
                    select: 'user username',
                    populate: {
                        path: 'user',
                        select: 'id username'
                    }
                })
                .lean();
            
            // Hide other players' characters
            populatedGame.players = populatedGame.players.map(player => {
                if (player.playerProfile.user._id.toString() !== userId) {
                    player.characters = player.characters.map(() => 'hidden');
                }
                return player;
            });

            socket.join(gameId);
            connectedUsers[userId] = socket.id;
            userGames[socket.id] = gameId;

            io.to(gameId).emit('gameUpdate', populatedGame);
            callback({ success: true, game: populatedGame });
        } catch (error) {
            console.error('joinGame Error:', error);
            callback({ success: false, message: 'Server Error' });
        }
    });
    // Handle disconnection
    socket.on('disconnect', async (reason) => {
        console.log(`Client disconnected: ${ socket.id }, Reason: ${ reason }`);
        const gameId = userGames[socket.id];
        const userId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
        if (gameId && userId) {
            try {
                const game = await Game.findById(gameId).populate('players.playerProfile');
                if (game) {
                    const playerIndex = game.players.findIndex(player => player.playerProfile.user._id.toString() === userId);
                    if (playerIndex !== -1) {
                        game.players[playerIndex].isConnected = false;
                        if (game.players.filter(p => p.isAlive && p.isConnected).length <= 1) {
                            game.status = 'finished';
                            game.winner = game.players.find(p => p.isAlive && p.isConnected)?.playerProfile.user._id;
                        }
                        await game.save();
                        const updatedGame = await Game.findById(gameId).populate({
                            path: 'players.playerProfile',
                            populate: { path: 'user' }
                        });
                        io.to(gameId).emit('gameUpdate', updatedGame);
                        io.to(gameId).emit('playerDisconnected', { userId: userId, reason });
                    }
                    // Clean up
                    delete userGames[socket.id];
                    delete connectedUsers[userId];
                    const room = io.sockets.adapter.rooms.get(gameId);
                    if (!room || room.size === 0) {
                        await Game.findByIdAndDelete(gameId);
                        console.log(`Game ${ gameId } deleted as no users are in the room`);
                    }
                }
                delete connectedUsers[userId];
            } catch (err) {
                console.error('Error handling disconnection:', err);
            }
        }
    });
    // Start Game Event
    socket.on('startGame', async ({ gameId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }
            if (game.status !== 'waiting') {
                return callback?.({ success: false, message: 'Game has already started' });
            }
            game.status = 'in_progress';
            game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
            game.currentPlayerUsername = game.players[game.currentPlayerIndex].username;
            await game.save();
            io.to(gameId).emit('gameUpdate', game);
            callback?.({ success: true, message: 'Game started successfully' });
        } catch (error) {
            console.error('startGame Error:', error);
            callback?.({ success: false, message: 'Failed to start game' });
        }
    });
    // Handle Action
    socket.on('action', async ({ gameId, actionType, targetUserId }, callback) => {
        console.log(`Action: ${actionType} Target: ${targetUserId}`)
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }
            if (game.status !== 'in_progress') {
                return callback?.({ success: false, message: 'Game is not in progress' });
            }
            const currentPlayer = game.players[game.currentPlayerIndex];
            if (currentPlayer.playerProfile.user._id.toString() !== socket.userId) {
                return callback?.({ success: false, message: 'Not your turn' });
            }
            
            // **New Rule Implementation**
            if (currentPlayer.coins >= 10 && actionType !== 'coup') {
                return callback?.({ success: false, message: 'You have 10 or more coins and must perform a coup.' });
            }

            // Check if the player has enough coins for the desired action
            const coinRequirements = {
                'coup': 7,
                'assassinate': 3,
                // Add other actions and their coin requirements if necessary
            };
            if (coinRequirements[actionType] && currentPlayer.coins < coinRequirements[actionType]) {
                return callback?.({ success: false, message: `Not enough coins to perform ${actionType}` });
            }

            // Check if the player has enough coins to perform coup if they have 10 or more
            if (currentPlayer.coins >= 10 && actionType !== 'coup') {
                return callback?.({ success: false, message: 'You have 10 or more coins and must perform a coup.' });
            }

            // Check if there is an ongoing pending action
            if (game.pendingAction) {
                return callback?.({ success: false, message: 'Another action is pending resolution' });
            }
            // Validate action type
            const validActions = ['income', 'foreignAid', 'coup', 'steal', 'exchange', 'taxes', 'assassinate'];
            if (!validActions.includes(actionType)) {
                return callback?.({ success: false, message: 'Invalid action type' });
            }
            // Actions that cannot be blocked or challenged
            const immediateActions = ['income', 'coup', 'exchange'];
            if (immediateActions.includes(actionType)) {
                // Execute the action immediately
                const action = {
                    type: actionType,
                    userId: currentPlayer.playerProfile.user._id.toString(),
                    targetUserId: targetUserId || null,
                    claimedRole: getClaimedRole(actionType),
                };
                const result = await executeAction(game, action);
                if (!result.success) {
                    return callback?.({ success: false, message: result.message });
                }
                // Advance the turn after action execution
                advanceTurn(game);
                await game.save();
                // Emit the updated game state to all players
                const gameUpdated = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                });
                io.to(gameId).emit('gameUpdate', gameUpdated);
                callback?.({ success: true, message: 'Action executed successfully' });
            } else {
                // Set pending action for actions that can be blocked or challenged
                game.pendingAction = {
                    type: actionType,
                    userId: currentPlayer.playerProfile.user._id.toString(),
                    targetUserId: targetUserId || null,
                    claimedRole: getClaimedRole(actionType),
                };
                await game.save();
                io.to(gameId).emit('pendingAction', { game });
                // Notify all players about the pending action
                callback?.({ success: true, message: 'Action initiated, awaiting challenges or blocks' });
            }
            // After setting pendingAction
            if (!immediateActions.includes(actionType)) {
                // Set a timeout to auto-execute the action after 30 seconds
                setActionTimeout(gameId, async () => {
                    const game = await Game.findById(gameId).populate({
                        path: 'players.playerProfile',
                        populate: { path: 'user' }
                    });
                    if (game && game.pendingAction) {
                        // Proceed as if no block or challenge was made
                        const action = game.pendingAction;
                        const result = await executeAction(game, action);
                        game.pendingAction = null;
                        advanceTurn(game);
                        await game.save();

                        // Emit the updated game state to all players
                        const gameUpdated = await Game.findById(gameId).populate({
                            path: 'players.playerProfile',
                            populate: { path: 'user' }
                        });
                        io.to(gameId).emit('gameUpdate', gameUpdated);
                        io.to(gameId).emit('actionExecuted', { 
                            success: true, 
                            message: 'Action executed automatically due to timeout' 
                        });
                    }
                }, 30000); // 30 seconds
            }
        } catch (error) {
            console.error('Action Error:', error);
            callback?.({ success: false, message: 'Server Error', error: error.message });
        }
    });
    // Handle Block
    socket.on('block', async ({ gameId, blockerId, actionType }, callback) => {
        console.log(`Block: ${actionType} Blocked By: ${blockerId}`)
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
            if (!game || !game.pendingAction) {
                console.log('No pending action to block')
                return callback?.({ success: false, message: 'No pending action to block' });
            }
            const action = game.pendingAction;
            const blocker = game.players.find(p => p.playerProfile.user._id.toString() === blockerId.toString());
            if (!blocker || !blocker.isAlive) {
                console.log('Blocker not found or not alive')
                return callback?.({ success: false, message: 'Blocker not found or not alive' });
            }
            // Validate if the action can be blocked (not if the player has the card)
            const canBlock = canActionBeBlocked(action.type);
            if (!canBlock) {
                return callback?.({ success: false, message: 'This action cannot be blocked' });
            }
            // Set block information
            game.pendingAction.blockedBy = blockerId;
            game.pendingAction.blockType = actionType;
            await game.save();
            console.log('Blocked action')
            console.log(game)
            // Clear the timeout as an action is being responded to
            clearActionTimeout(gameId);

            // Notify all players about the block
            io.to(gameId).emit('blockAttempt', { 
                success: true, 
                message: 'Block attempted',
                game: game
            });
            callback?.({ success: true, message: 'Block attempted successfully' });

            // Set a new timeout for the original player to respond to the block
            setActionTimeout(gameId, async () => {
                const updatedGame = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                });
                if (updatedGame && updatedGame.pendingAction) {
                    // If the original player didn't respond, the block succeeds
                    updatedGame.pendingAction = null;
                    advanceTurn(updatedGame);
                    await updatedGame.save();
                    io.to(gameId).emit('gameUpdate', updatedGame);
                    io.to(gameId).emit('blockResult', { 
                        success: true, 
                        message: 'Block succeeded due to timeout',
                        game: updatedGame
                    });
                }
            }, 30000); // 30 seconds timeout
        } catch (error) {
            console.error('Block Error:', error);
            callback?.({ success: false, message: 'Server Error during block', error: error.message });
        }
    });

    // Add new socket event for responding to a block
    socket.on('respondToBlock', async ({ gameId, response, userId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
            if (!game || !game.pendingAction || !game.pendingAction.blockedBy) {
                return callback?.({ success: false, message: 'No pending block to respond to' });
            }

            clearActionTimeout(gameId);

            if (response === 'accept') {
                // Block is accepted, cancel the original action
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();
                io.to(gameId).emit('gameUpdate', game);
                io.to(gameId).emit('blockResult', { 
                    success: true, 
                    message: 'Block accepted',
                    game: game
                });
            } else if (response === 'challenge') {
                // Challenge the block
                const blocker = game.players.find(p => p.playerProfile.user._id.toString() === game.pendingAction.blockedBy.toString());
                const hasRole = blocker.characters.includes(game.pendingAction.blockType);
                
                if (hasRole) {
                    // Challenger loses an influence
                    const challenger = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
                    removeRandomCharacter(challenger);
                    // The block succeeds
                    game.pendingAction = null;
                    advanceTurn(game);
                } else {
                    // Blocker loses an influence
                    removeRandomCharacter(blocker);
                    // The original action proceeds
                    const result = await executeAction(game, game.pendingAction);
                    game.pendingAction = null;
                    advanceTurn(game);
                }
                await game.save();
                io.to(gameId).emit('gameUpdate', game);
                io.to(gameId).emit('blockChallengeResult', { 
                    success: !hasRole, 
                    message: hasRole ? 'Block challenge failed' : 'Block challenge succeeded',
                    game: game
                });
            }

            callback?.({ success: true, message: 'Response to block processed' });
        } catch (error) {
            console.error('Respond to Block Error:', error);
            callback?.({ success: false, message: 'Server Error during block response', error: error.message });
        }
    });

    // Handle Challenge
    socket.on('challenge', async ({ gameId, challengerId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
            if (!game || !game.pendingAction) {
                return callback?.({ success: false, message: 'No pending action to challenge' });
            }
            const action = game.pendingAction;
            const challenger = game.players.find(p => p.playerProfile.user._id.toString() === challengerId.toString());
            if (!challenger || !challenger.isAlive) {
                return callback?.({ success: false, message: 'Challenger not found or not alive' });
            }
            // Verify if the action involves a claimed role
            if (!action.claimedRole) {
                return callback?.({ success: false, message: 'No role was claimed for this action' });
            }
            // Check if the acting player has the claimed role
            const actingPlayer = game.players.find(p => p.playerProfile.user._id.toString() === action.userId.toString());
            if (!actingPlayer) {
                return callback?.({ success: false, message: 'Acting player not found' });
            }
            const hasRole = actingPlayer.characters.includes(action.claimedRole);
            if (hasRole) {
                // Challenger loses an influence
                removeRandomCharacter(challenger);
                // The action proceeds
                const result = await executeAction(game, action);
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();

                // Clear the timeout as action is being resolved
                clearActionTimeout(gameId);

                io.to(gameId).emit('challengeResult', {
                    success: false,
                    message: 'Challenge failed: Challenger lost an influence, action proceeds'
                });
            } else {
                // Acting player loses an influence
                removeRandomCharacter(actingPlayer);
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();

                // Clear the timeout as action is being resolved
                clearActionTimeout(gameId);

                io.to(gameId).emit('challengeResult', {
                    success: true,
                    message: 'Challenge succeeded: Acting player lost an influence, action blocked'
                });
            }
            callback?.({ success: true, message: 'Challenge resolved' });
        } catch (error) {
            console.error('Challenge Error:', error);
            callback?.({ success: false, message: 'Server Error during challenge', error: error.message });
        }
    });

    // Handle Accept Action (No challenges or blocks)
    socket.on('acceptAction', async ({ gameId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
            if (!game || !game.pendingAction) {
                return callback?.({ success: false, message: 'No pending action to acc]ept' });
            }
            const action = game.pendingAction;

            // Clear the timeout as action is being resolved
            clearActionTimeout(gameId);

            // Execute the action
            const result = await executeAction(game, action);
            game.pendingAction = null;
            advanceTurn(game);
            await game.save();
            io.to(gameId).emit('actionExecuted', {
                success: result.success,
                message: result.message,
                game: game
            });

            callback?.({ success: true, message: 'Action executed' });
        } catch (error) {
            console.error('Accept Action Error:', error);
            callback?.({ success: false, message: 'Server Error during accept action', error: error.message });
        }
    });
    // Helper Functions
    const getClaimedRole = (actionType) => {
        switch (actionType) {
            case 'taxes':
                return 'Duke';
            case 'assassinate':
                return 'Assassin';
            case 'steal':
                return 'Captain';
            case 'exchange':
                return 'Ambassador';
            case 'coup':
                return null; // No role required
            case 'income':
                return null;
            case 'foreignAid':
                return null;
            default:
                return null;
        }
    };
    const canActionBeBlocked = (actionType) => {
        const blockRules = {
            'foreignAid': ['Duke'],
            'steal': ['Captain', 'Ambassador'],
            'assassinate': ['Contessa']
        };
        return !!blockRules[actionType]; // Return true if the action can be blocked, false otherwise
    };
    const advanceTurn = (game) => {
        if (checkGameOver(game)) {
            game.status = 'finished';
        } else {
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            game.currentPlayerUsername = game.players[game.currentPlayerIndex].username;
        }
        return game;
    };
};
module.exports = { gameSockets };