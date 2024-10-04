const Game = require('../models/Game');
const User = require('../models/User');
const { 
    handleIncome, 
    handleForeignAid, 
    handleCoup, 
    handleTaxes, 
    handleAssassinate,
    handleSteal, // Imported handleSteal
    checkGameOver
} = require('../services/gameService');

const connectedUsers = {}; // To track userId to socket.id
const userGames = {}; // To track socket.id to gameId

const gameSockets = (io, socket) => {
    // Join a game room
    socket.on('joinGame', async ({ gameId, userId }, callback) => {
        try {
            socket.join(gameId);
            connectedUsers[userId] = socket.id;
            userGames[socket.id] = gameId;

            const game = await Game.findById(gameId).populate('players.playerProfile.user');
            if (!game) {
                return callback({ success: false, message: 'Game not found' });
            }

            io.to(gameId).emit('gameUpdate', game);
            if (callback) callback({ success: true });
        } catch (error) {
            console.error('joinGame Error:', error);
            if (callback) callback({ success: false, message: 'Failed to join game' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);

        const gameId = userGames[socket.id];
        const userId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
        if (gameId && userId) {
            try {
                const game = await Game.findById(gameId);
                if (game) {
                    // Find the player associated with this socket
                    const playerIndex = game.players.findIndex(player => player.playerProfile.toString() === userId);
                    
                    if (playerIndex !== -1) {
                        // Mark the player as disconnected
                        game.players[playerIndex].isConnected = false;
                        
                        // Optionally handle game status changes
                        if (game.players.filter(p => p.isAlive && p.isConnected).length <= 1) {
                            game.status = 'finished';
                            game.winner = game.players.find(p => p.isAlive && p.isConnected)?.playerProfile;
                        }

                        await game.save();

                        // Notify remaining players
                        const updatedGame = await Game.findById(gameId).populate('players.playerProfile.user');
                        io.to(gameId).emit('gameUpdate', updatedGame);

                        // Notify about disconnection
                        io.to(gameId).emit('playerDisconnected', { userId: userId, reason });
                    }

                    // Clean up
                    delete userGames[socket.id];
                    delete connectedUsers[userId];

                    // Check if the room is empty
                    const room = io.sockets.adapter.rooms.get(gameId);
                    if (!room || room.size === 0) {
                        await Game.findByIdAndDelete(gameId);
                        console.log(`Game ${gameId} deleted as no users are in the room`);
                    }
                }
                delete connectedUsers[userId];
            } catch (err) {
                console.error('Error handling disconnection:', err);
            }
        }
    });

    // Optionally handle reconnection
    socket.on('reconnectUser', async ({ gameId, userId }, callback) => {
        try {
            socket.join(gameId);
            connectedUsers[userId] = socket.id;
            userGames[socket.id] = gameId;

            const game = await Game.findById(gameId).populate('players.playerProfile.user');
            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }

            // Mark the player as connected
            const player = game.players.find(p => p.playerProfile.toString() === userId);
            if (player) {
                player.isConnected = true;
                await game.save();
            }

            io.to(gameId).emit('gameUpdate', game);
            if (callback) callback?.({ success: true });
        } catch (error) {
            console.error('reconnectUser Error:', error);
            if (callback) callback?.({ success: false, message: 'Failed to reconnect user' });
        }
    });

    // Optionally, handle game start event if needed
    socket.on('startGame', async ({ gameId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate('players.playerProfile.user');
            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }

            // Update game status
            game.status = 'in_progress';
            game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);

            await game.save();

            // Notify all players
            io.to(gameId).emit('gameUpdate', game);

            callback?.({ success: true });
        } catch (error) {
            console.error('startGame Error:', error);
            callback?.({ success: false, message: 'Failed to start game' });
        }
    });

    // Handle challenges
    socket.on('challenge', async ({ gameId, challengerId, actionType, actedUserId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });

            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }

            // Determine if the actionType can be challenged
            const actionRequiresChallenge = ['taxes', 'assassinate', 'steal', 'exchange', 'coup', 'income', 'foreignAid'];
            if (!actionRequiresChallenge.includes(actionType)) {
                return callback?.({ success: false, message: 'Action cannot be challenged' });
            }

            // Logic to verify if the challenge is successful
            const actedPlayer = game.players.find(p => p.playerProfile.user._id.toString() === actedUserId.toString());

            if (!actedPlayer) {
                return callback?.({ success: false, message: 'Acted player not found' });
            }

            // Here you need to verify if the acted player actually has the role claimed
            // This requires storing the claimed role during the action phase
            // For simplicity, let's assume we have stored the claimed role in game.pendingAction.claimedRole
            const claimedRole = game.pendingAction.claimedRole;

            if (actedPlayer.characters.includes(claimedRole)) {
                // Challenge failed: challenger loses a card
                const challenger = game.players.find(p => p.playerProfile.user._id.toString() === challengerId.toString());
                if (challenger) {
                    removeRandomCharacter(challenger);
                    await game.save();
                    io.to(gameId).emit('gameUpdate', game);
                    return callback?.({ success: true, message: 'Challenge failed: Challenger lost a card' });
                }
            } else {
                // Challenge succeeded: acted player loses a card
                removeRandomCharacter(actedPlayer);
                await game.save();
                io.to(gameId).emit('gameUpdate', game);
                return callback?.({ success: true, message: 'Challenge succeeded: Acted player lost a card' });
            }

            callback?.({ success: false, message: 'Challenge processing failed' });
        } catch (error) {
            console.error('Challenge Error:', error);
            callback?.({ success: false, message: 'Server Error during challenge' });
        }
    });

    // Handle blocks
    socket.on('block', async ({ gameId, blockerId, actionType, actedUserId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });

            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }

            // Determine if the actionType can be blocked
            const actionBlockingRules = {
                'foreignAid': ['Duke'],
                'steal': ['Captain', 'Ambassador'],
                'assassinate': ['Contessa']
                // Add more as needed
            };

            if (!actionBlockingRules[actionType]) {
                return callback?.({ success: false, message: 'Action cannot be blocked' });
            }

            const blocker = game.players.find(p => p.playerProfile.user._id.toString() === blockerId.toString());

            if (!blocker) {
                return callback?.({ success: false, message: 'Blocker not found' });
            }

            // Check if blocker has one of the required roles
            const canBlock = actionBlockingRules[actionType].some(role => blocker.characters.includes(role));

            if (!canBlock) {
                return callback?.({ success: false, message: 'Blocker does not have the required role to block' });
            }

            // Logic to verify if the block is genuine or a bluff
            // Similar to challenge handling
            const actedPlayer = game.players.find(p => p.playerProfile.user._id.toString() === actedUserId.toString());

            if (!actedPlayer) {
                return callback?.({ success: false, message: 'Acted player not found' });
            }

            // Assume claimedRole is stored in game.pendingAction.claimedRole
            const claimedRole = game.pendingAction.claimedRole;

            if (blocker.characters.includes(claimedRole)) {
                // Block is genuine: no action needed
                io.to(gameId).emit('gameUpdate', game);
                return callback?.({ success: true, message: 'Action blocked successfully' });
            } else {
                // Block is a bluff: blocker loses a card
                removeRandomCharacter(blocker);
                await game.save();
                io.to(gameId).emit('gameUpdate', game);
                return callback?.({ success: true, message: 'Block failed: Blocker lost a card' });
            }

        } catch (error) {
            console.error('Block Error:', error);
            callback?.({ success: false, message: 'Server Error during block' });
        }
    });

    // Helper function to remove a random character
    const removeRandomCharacter = (player) => {
        if (player.characters.length > 0) {
            const randomIndex = Math.floor(Math.random() * player.characters.length);
            player.characters.splice(randomIndex, 1);
            if (player.characters.length === 0) {
                player.isAlive = false;
            }
        }
    };

    // Override the 'action' event to handle pending actions
    socket.on('action', async ({ gameId, actionType, targetUserId, userId }, callback) => {
        console.log('action', gameId, actionType, targetUserId, userId);
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                select: 'user username',
                populate: {
                    path: 'user',
                    select: '_id username'
                }
            });

            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }

            // Check if it's the player's turn
            const currentPlayerIdString = game.players[game.currentPlayerIndex].playerProfile.user._id.toString();
            const userIdString = userId;

            if (currentPlayerIdString !== userIdString) {
                return callback?.({ success: false, message: 'It\'s not your turn' });
            }

            game.pendingAction = {
                type: actionType,
                userId: userId,
                targetUserId: targetUserId,
                claimedRole: getClaimedRole(actionType, game, userId)
            };

            await game.save();

            io.to(gameId).emit('pendingAction', { actionType, userId, targetUserId, claimedRole: game.pendingAction.claimedRole });

            // Wait for challenges or blocks within a timeframe (e.g., 30 seconds)
            // Implementation of timeout is required

            callback?.({ success: true, message: 'Action initiated, awaiting challenges or blocks' });
        } catch (err) {
            console.error('Action Error:', err);
            callback?.({ success: false, message: 'Server Error', error: err.message });
        }
    });

    // Helper function to get the claimed role based on action
    const getClaimedRole = (actionType, game, userId) => {
        switch(actionType) {
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

    // Handle accepting the action after no challenges or blocks
    socket.on('acceptAction', async ({ gameId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                select: 'user username coins characters',
                populate: {
                    path: 'user',
                    select: '_id username'
                }
            });

            if (!game || !game.pendingAction) {
                return callback({ success: false, message: 'No pending action to accept' });
            }

            const { type, userId, targetUserId, claimedRole } = game.pendingAction;

            let result;
            switch(type) {
                case 'income':
                    result = await handleIncome(game, userId);
                    break;
                case 'foreignAid':
                    result = await handleForeignAid(game, userId);
                    break;
                case 'coup':
                    if (!targetUserId) {
                        return callback?.({ success: false, message: 'Target user ID is required for coup' });
                    }
                    result = await handleCoup(game, userId, targetUserId);
                    break;
                case 'taxes':
                    result = await handleTaxes(game, userId);
                    break;
                case 'assassinate':
                    if (!targetUserId) {
                        return callback?.({ success: false, message: 'Target user ID is required for assassinate' });
                    }
                    result = await handleAssassinate(game, userId, targetUserId);
                    break;
                case 'steal':
                    if (!targetUserId) {
                        return callback?.({ success: false, message: 'Target user ID is required for steal' });
                    }
                    result = await handleSteal(game, userId, targetUserId);
                    break;
                default:
                    return callback?.({ success: false, message: 'Unknown action type' });
            }

            if (result.success) {
                // Clear pending action
                game.pendingAction = null;

                // Check if the game is over
                const gameOver = checkGameOver(game);
                if (gameOver) {
                    game.status = 'finished';
                    game.winner = gameOver;
                }

                await game.save();

                // Emit game update to all players in the game
                const gameUpdate = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    select: 'user username',
                    populate: {
                        path: 'user',
                        select: '_id username'
                    }
                });
                io.to(gameId).emit('gameUpdate', gameUpdate);
                if (game.status === 'finished') {
                    io.to(gameId).emit('gameOver', { winner: game.winner });
                }

                callback?.({ success: true, message: 'Action performed successfully', game: game });
            } else {
                callback?.({ success: false, message: result.message });
            }
        } catch (err) {
            console.error('Accept Action Error:', err);
            callback?.({ success: false, message: 'Server Error', error: err.message });
        }
    });

};

module.exports = { gameSockets };