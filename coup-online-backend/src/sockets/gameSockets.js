    // Start of Selection
    const Game = require('../models/Game');
    const User = require('../models/User');
    const PlayerProfile = require('../models/PlayerProfile');
    const {
        checkGameOver,
        removeRandomCharacter,
        executeAction,
        addUserToGame,
        startGameLogic,
        formatGameData
    } = require('../services/gameService');
    const { setActionTimeout, clearActionTimeout } = require('../services/timerService');
    
    const connectedUsers = {}; // To track userId to socket.id
    const userGames = {}; // To track socket.id to gameId
    
    const gameSockets = (io, socket) => {
        // Create a game
        socket.on('createGame', async ({ playerCount }, callback) => {
            try {
                const userId = socket.user.id; // Extracted from authenticated socket
                const playerProfile = await PlayerProfile.findOne({ user: userId }).populate('user');
                
                if (!playerProfile) {
                    return callback({ success: false, message: 'Player profile not found' });
                }
    
                const newGame = new Game({
                    maxPlayers: playerCount,
                    status: 'waiting',
                    players: []
                });
    
                await newGame.save();
    
                // Add the creator to the game
                const addUserResult = await addUserToGame(newGame, playerProfile);
                if (!addUserResult.success) {
                    return callback({ success: false, message: addUserResult.message });
                }
    
                const populatedGame = await Game.findById(newGame._id).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                });
    
                await populatedGame.save();
    
                socket.join(populatedGame._id.toString());
                connectedUsers[userId] = socket.id;
                userGames[socket.id] = populatedGame._id.toString();
    
                // Emit game update to all players in the room
                await emitGameUpdate(populatedGame._id.toString(), userId);
    
                callback({ success: true, game: populatedGame });
            } catch (err) {
                console.error(err);
                callback({ success: false, message: 'Server Error' });
            }
        });
    
        // Join a game room
        socket.on('joinGame', async ({ gameId }, callback) => {
            try {
                const userId = socket.user.id; // Extracted from authenticated socket
                const playerProfile = await PlayerProfile.findOne({ user: userId }).populate('user');
                if (!playerProfile) {
                    return callback({ success: false, message: 'Player profile not found' });
                }
    
                const game = await Game.findById(gameId).populate('players.playerProfile');
                if (!game) {
                    return callback({ success: false, message: 'Game not found' });
                }
    
                const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
                if (player) {
                    player.isConnected = true;
                    await game.save();
                    socket.join(gameId);
                    connectedUsers[userId] = socket.id;
                    userGames[socket.id] = gameId;
                    await emitGameUpdate(gameId, userId);
                    return callback({ success: true, message: 'User reconnected to the game', game });
                }
    
                if (game.status !== 'waiting') {
                    return callback({ success: false, message: 'Game has already started or finished' });
                }
    
                if (game.players.length >= game.maxPlayers) {
                    return callback({ success: false, message: 'Game is full' });
                }
    
                const response = await addUserToGame(game, playerProfile);
                if (!response.success) {
                    return callback({ success: false, message: response.message });
                }
    
                socket.join(gameId);
                connectedUsers[userId] = socket.id;
                userGames[socket.id] = gameId;
    
                const updatedGame = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                });
    
                await emitGameUpdate(gameId, userId);
                callback({ success: true, game: updatedGame });
            } catch (error) {
                console.error('joinGame Error:', error);
                callback({ success: false, message: 'Server Error' });
            }
        });
    
        // Handle disconnection
        socket.on('disconnect', async (reason) => {
            console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
            const gameId = userGames[socket.id];
            const userId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
            if (gameId && userId) {
                try {
                    const game = await Game.findById(gameId).populate({
                        path: 'players.playerProfile',
                        populate: { path: 'user' }
                    }).lean();
                    if (game) {
                        const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
                        if (player) {
                            player.isConnected = false;
                            if (game.players.filter(p => p.isAlive && p.isConnected).length <= 1) {
                                game.status = 'finished';
                                game.winner = game.players.find(p => p.isAlive && p.isConnected)?.playerProfile.user._id;
                            }
                            await Game.findByIdAndUpdate(gameId, game, { new: true });
    
                            await emitGameUpdate(gameId, userId);
                            io.to(gameId).emit('playerDisconnected', { userId, reason });
    
                            // Cleanup
                            userGames[socket.id] = null;
                            delete connectedUsers[userId];
                            const room = io.sockets.adapter.rooms.get(gameId);
                            if (!room || room.size === 0) {
                                await Game.findByIdAndDelete(gameId);
                                console.log(`Game ${gameId} deleted as no users are in the room`);
                            }
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
                const response = await startGameLogic(gameId, socket.user.id, io);
    
                if (!response.success) {
                    return callback?.({ success: false, message: response.message });
                }
    
                callback?.({ success: true, message: 'Game started successfully', game: response.game });
            } catch (error) {
                console.error('startGame Error:', error);
                callback?.({ success: false, message: 'Failed to start game' });
            }
        });
    
            // Handle Action
            socket.on('action', async ({ gameId, actionType, targetUserId }, callback) => {
                try {
                    const userId = socket.user.id;
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
                    if (currentPlayer.playerProfile.user.id.toString() !== userId) {
                        return callback?.({ success: false, message: 'Not your turn' });
                    }
                    // Mandatory Coup Check
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
                    // Validate action type
                    const validActions = ['income', 'foreignAid', 'coup', 'steal', 'exchange', 'taxes', 'assassinate'];
                    if (!validActions.includes(actionType)) {
                        return callback?.({ success: false, message: 'Invalid action type' });
                    }
                    // Check if the action can be blocked
                    const canBeBlocked = canActionBeBlocked(actionType);
                    const canBeChallenged = canActionBeChallenged(actionType);
                    if (canBeBlocked || canBeChallenged) {
                        // Set pending action with blockable flag
                        game.pendingAction = {
                            type: actionType,
                            userId: currentPlayer.playerProfile.user.id.toString(),
                            targetUserId: targetUserId || null,
                            claimedRole: getClaimedRole(actionType),
                            canBeBlocked: canBeBlocked,
                            canBeChallenged: canBeChallenged,
                        };
                        console.log(game.pendingAction);
                        await game.save();
                        await emitGameUpdate(gameId, userId);
                        callback?.({ success: true, message: 'Action initiated, awaiting challenges or blocks' });
                        // Set a timeout to auto-execute the action after 30 seconds if no response
                        setActionTimeout(gameId, async () => {
                            const updatedGame = await Game.findById(gameId).populate({
                                path: 'players.playerProfile',
                                populate: { path: 'user' }
                            });
                            if (updatedGame && updatedGame.pendingAction) {
                                const action = updatedGame.pendingAction;
                                const result = await executeAction(updatedGame, action);
                                updatedGame.pendingAction = null;
                                advanceTurn(updatedGame);
                                await Game.findByIdAndUpdate(gameId, updatedGame, { new: true });
                                // Emit the updated game state to all players
                                await emitGameUpdate(gameId, userId);
                                io.to(gameId).emit('actionExecuted', {
                                    success: true,
                                    message: 'Action executed automatically due to timeout'
                                });
                            }
                        }, 30000); // 30 seconds
                    } else {
                        // Execute immediate actions
                        const action = {
                            type: actionType,
                            userId: currentPlayer.playerProfile.user.id.toString(),
                            targetUserId: targetUserId || null,
                            claimedRole: getClaimedRole(actionType),
                        };
                        const result = await executeAction(game, action);
                        if (!result.success) {
                            return callback?.({ success: false, message: result.message });
                        }
                        advanceTurn(game);
                        await game.save();
                        await emitGameUpdate(gameId, userId);
                        callback?.({ success: true, message: 'Action executed successfully' });
                    }
                } catch (error) {
                    console.error('Action Error:', error);
                    callback?.({ success: false, message: 'Server Error', error: error.message });
                }
            });
        
            // Handle Block
            socket.on('block', async ({ gameId, blockerId }, callback) => {
                try {
                    const userId = socket.user.id;
                    const game = await Game.findById(gameId).populate({
                        path: 'players.playerProfile',
                        populate: { path: 'user' }
                    });
                    if (!game || !game.pendingAction || !game.pendingAction.canBeBlocked) {
                        return callback?.({ success: false, message: 'No pending action to block' });
                    }
                    const action = game.pendingAction;
                    const blocker = game.players.find(p => p.playerProfile.user.id.toString() === blockerId.toString());
                    if (!blocker || !blocker.isAlive) {
                        return callback?.({ success: false, message: 'Blocker not found or not alive' });
                    }
                    // Determine if the blocker can block the action based on claimed role
                    const requiredRoles = getBlockingRoles(action.type);
                    if (!requiredRoles || requiredRoles.length === 0) {
                        return callback?.({ success: false, message: 'This action cannot be blocked' });
                    }
                    // Record the block attempt
                    game.pendingAction.block = {
                        blockerId: blockerId,
                        claimedRole: getBlockingRole(action.type),
                    };
                    await game.save();
                    // Emit game update
                    await emitGameUpdate(gameId, userId);
                    io.to(gameId).emit('actionBlocked', { blockerId, actionType: action.type });
                    callback?.({ success: true, message: 'Block attempted, awaiting challenge or acceptance' });
                } catch (error) {
                    console.error('Block Error:', error);
                    callback?.({ success: false, message: 'Server Error during block', error: error.message });
                }
            });
        
            // Handle Challenge
            socket.on('challenge', async ({ gameId, challengerId, targetType }, callback) => {
                try {
                    const userId = socket.user.id;
                    const game = await Game.findById(gameId).populate({
                        path: 'players.playerProfile',
                        populate: { path: 'user' }
                    });
                    if (!game || !game.pendingAction) {
                        return callback?.({ success: false, message: 'No pending action to challenge' });
                    }
                    const action = game.pendingAction;
                    let challengedPlayer, challengedRole;
                    if (targetType === 'action') {
                        challengedPlayer = game.players.find(p => p.playerProfile.user.id.toString() === action.userId);
                        challengedRole = action.claimedRole;
                    } else if (targetType === 'block') {
                        if (!action.block) {
                            return callback?.({ success: false, message: 'No block to challenge' });
                        }
                        challengedPlayer = game.players.find(p => p.playerProfile.user.id.toString() === action.block.blockerId);
                        challengedRole = action.block.claimedRole;
                    } else {
                        return callback?.({ success: false, message: 'Invalid target type for challenge' });
                    }
                    if (!challengedPlayer) {
                        return callback?.({ success: false, message: 'Challenged player not found' });
                    }
                    // Check if the challenged player actually has the claimed role
                    const hasRole = challengedPlayer.characters.includes(challengedRole);
                    if (hasRole) { // Challenger is wrong
                        const challenger = game.players.find(p => p.playerProfile.user.id.toString() === challengerId.toString());
                        removeRandomCharacter(challenger);
                        
                        // If the challenge was against a block, the block succeeds
                        if (targetType === 'block') {
                            game.pendingAction = null;
                            advanceTurn(game);
                            await game.save();
                            await emitGameUpdate(gameId, userId);
                            io.to(gameId).emit('challengeResult', {
                                success: false,
                                message: `${challenger.username} lost an influence. Challenge against block failed.`,
                                game: game
                            });
                        } else { // Challenge against an action
                            game.pendingAction = null;
                            advanceTurn(game);
                            await game.save();
                            await emitGameUpdate(gameId, userId);
                            io.to(gameId).emit('challengeResult', {
                                success: false,
                                message: `${challenger.username} lost an influence. Challenge against action failed.`,
                                game: game
                            });
                        }
                    } else { // Challenged player does not have the claimed role
                        removeRandomCharacter(challengedPlayer);
                        
                        if (targetType === 'action') { // Action is invalidated
                            game.pendingAction = null;
                        } else if (targetType === 'block') { // Block is invalidated, action proceeds
                            game.pendingAction = null;
                            const result = await executeAction(game, action);
                            advanceTurn(game);
                        }
                        await game.save();
                        await emitGameUpdate(gameId, userId);
                        io.to(gameId).emit('challengeResult', {
                            success: true,
                            message: `${challengedPlayer.username} lost an influence. Challenge succeeded.`,
                            game: game
                        });
                    }
                    callback?.({ success: true, message: 'Challenge processed' });
                } catch (error) {
                    console.error('Challenge Error:', error);
                    callback?.({ success: false, message: 'Server Error during challenge', error: error.message });
                }
            });
    
        // Handle Respond to Block
        socket.on('respondToBlock', async ({ gameId, response, userId }, callback) => {
            try {
                const game = await Game.findById(gameId).populate({
                    path: 'players.playerProfile.user'
                });
                if (!game || !game.pendingAction || !game.pendingAction.block) {
                    return callback?.({ success: false, message: 'No pending block to respond to' });
                }
    
                clearActionTimeout(gameId);
    
                if (response === 'accept') {
                    // Block is accepted, cancel the original action
                    game.pendingAction = null;
                    advanceTurn(game);
                    await game.save();
                    const gameUpdated = await Game.findById(gameId).populate({
                        path: 'players.playerProfile',
                        populate: { path: 'user' }
                    }).lean();
                    await emitGameUpdate(gameId, userId);
                    io.to(gameId).emit('blockResult', { 
                        success: true, 
                        message: 'Block accepted',
                        game: gameUpdated
                    });
                } else if (response === 'challenge') {
                    // Challenge the block
                    const blocker = game.players.find(p => p.playerProfile.user._id.toString() === game.pendingAction.block.blockerId.toString());
                    const hasRole = blocker.characters.includes(game.pendingAction.block.claimedRole);
                    
                    if (hasRole) {
                        // Challenger loses an influence
                        const challenger = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
                        removeRandomCharacter(challenger);
                        
                        // The block succeeds
                        game.pendingAction = null;
                        advanceTurn(game);
                        await game.save();
                        const gameUpdated = await Game.findById(gameId).populate({
                            path: 'players.playerProfile',
                            populate: { path: 'user' }
                        }).lean();
                        await emitGameUpdate(gameId, userId);
                        io.to(gameId).emit('blockChallengeResult', { 
                            success: false, 
                            message: 'Block challenge failed. Challenger lost an influence.',
                            game: gameUpdated 
                        });
                    } else {
                        // Blocker loses an influence
                        removeRandomCharacter(blocker);
                        
                        // The original action proceeds
                        const result = await executeAction(game, game.pendingAction);
                        game.pendingAction = null;
                        advanceTurn(game);
                        await game.save();
                        const gameUpdated = await Game.findById(gameId).populate({
                            path: 'players.playerProfile',
                            populate: { path: 'user' }
                        }).lean();
                        await emitGameUpdate(gameId, userId);
                        io.to(gameId).emit('blockChallengeResult', { 
                            success: true, 
                            message: 'Block challenge succeeded. Blocker lost an influence.',
                            game: gameUpdated 
                        });
                    }
                }
    
                callback?.({ success: true, message: 'Response to block processed' });
            } catch (error) {
                console.error('Respond to Block Error:', error);
                callback?.({ success: false, message: 'Server Error during block response', error: error.message });
            }
        });
    
        // Handle Accept Action (No challenges or blocks)
        socket.on('acceptAction', async ({ gameId }, callback) => {
            try {
                const game = await Game.findById(gameId).populate({
                    path: 'players.playerProfile.user'
                });
                if (!game || !game.pendingAction) {
                    return callback?.({ success: false, message: 'No pending action to accept' });
                }
                const action = game.pendingAction;
    
                // Clear the timeout as action is being resolved
                clearActionTimeout(gameId);
    
                // Execute the action
                const result = await executeAction(game, action);
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();
                const gameUpdated = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                }).lean();
                io.to(gameId).emit('actionExecuted', {
                    success: result.success,
                    message: result.message,
                    game: gameUpdated
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
    
        const canActionBeChallenged = (actionType) => {
            const challengeRules = {
                'taxes': true,
                'assassinate': true,
                'steal': true,
                'exchange': true,
                'foreignAid': false,
                'income': false,
                'coup': false
            };
            return challengeRules[actionType] || false; // Return true if the action can be challenged, false otherwise
        };

        const getBlockingRoles = (actionType) => {
            const blockRules = {
                'foreignAid': ['Duke'],
                'steal': ['Captain', 'Ambassador'],
                'assassinate': ['Contessa']
            };
            return blockRules[actionType] || []; // Return an array of roles that can block the action
        };

        const getBlockingRole = (actionType) => {
            const blockRules = {
                'foreignAid': 'Duke',
                'steal': 'Captain',
                'assassinate': 'Contessa'
            };
            return blockRules[actionType] || null; // Return the role that can block the action
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
    
        // Helper function to log room members
        const logRoomMembers = (gameId) => {
            const room = io.sockets.adapter.rooms.get(gameId);
            console.log(`Room ${gameId} has ${room.size} members:`);
            room.forEach(socketId => {
                console.log(`- Socket ID: ${socketId}`);
            });
        };
    
        const emitGameUpdate = async (gameId, userId) => {
            try {
                const updatedGame = await Game.findById(gameId)
                    .populate({
                        path: 'players.playerProfile',
                        populate: { path: 'user' }
                    })
                    .lean(); // Use .lean() for better performance
                const formattedGame = formatGameData(updatedGame, userId);
                const room = io.sockets.adapter.rooms.get(gameId);
                if (room && room.size > 0) {
                    io.to(gameId).emit('gameUpdate', formattedGame);
                    console.log(`Emitted gameUpdate to room ${gameId} for game ${gameId}`);
                } else {
                    console.warn(`Attempted to emit to room ${gameId}, but it does not exist or has no members.`);
                }
            } catch (error) {
                console.error('Error emitting gameUpdate:', error);
            }
        };
    
        // Handle Get Game Request
        socket.on('getGame', async ({ gameId, userId }, callback) => {
            try {
                const game = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                }).lean();

                if (!game) {
                    return callback({ success: false, message: 'Game not found' });
                }

                const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
                if (!player) {
                    return callback({ success: false, message: 'Access denied: You are not a participant of this game.' });
                }

                const formattedGame = formatGameData(game, userId);
                callback({ success: true, game: formattedGame });
            } catch (error) {
                console.error('getGame Error:', error);
                callback({ success: false, message: 'Server Error fetching game data.' });
            }
        });
    };
    
    module.exports = { gameSockets };