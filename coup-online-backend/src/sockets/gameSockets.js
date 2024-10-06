const Game = require('../models/Game');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const {
    checkGameOver,
    removeRandomCharacter,
    executeAction,
    addUserToGame,
    startGameLogic,
    formatGameData,
    initializeDeck,
    shuffleArray,
    handleExchange,
    advanceTurn
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

            // Initialize the deck based on the number of players
            const deck = initializeDeck(playerCount);

            const newGame = new Game({
                maxPlayers: playerCount,
                status: 'waiting',
                players: [],
                deck: deck,
                centralTreasury: 1000, // Initial treasury value, adjust as needed
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
            await emitGameUpdate(populatedGame._id);

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
                await emitGameUpdate(gameId);
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

            await emitGameUpdate(gameId);
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
                });
                if (game) {
                    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
                    if (player) {
                        player.isConnected = false;
                        if (game.players.filter(p => p.isAlive && p.isConnected).length <= 1) {
                            game.status = 'finished';
                            game.winner = game.players.find(p => p.isAlive && p.isConnected)?.playerProfile.user.username;
                        }
                        await game.save();

                        await emitGameUpdate(gameId, userId);
                        io.to(gameId).emit('playerDisconnected', { userId, reason });

                        // Cleanup
                        delete userGames[socket.id];
                        delete connectedUsers[userId];
                        const room = io.sockets.adapter.rooms.get(gameId);
                        if (!room || room.size === 0) {
                            await Game.findByIdAndDelete(gameId);
                            console.log(`Game ${gameId} deleted as no users are in the room`);
                        }
                    }
                }
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

    // Start of Selection
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
            if (game.pendingAction) {
                return callback?.({ success: false, message: 'Another action is already pending' });
            }
            const currentPlayer = game.players[game.currentPlayerIndex];
            if (currentPlayer.playerProfile.user._id.toString() !== userId) {
                return callback?.({ success: false, message: 'Not your turn' });
            }
            if (!currentPlayer.isAlive) {
                return callback?.({ success: false, message: 'You are not alive in this game' });
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
            const validActions = ['income', 'foreignAid', 'coup', 'steal', 'taxes', 'assassinate'];
            if (!validActions.includes(actionType)) {
                return callback?.({ success: false, message: 'Invalid action type' });
            }
            
            // If the action is income or coup, execute immediately
            if (actionType === 'income' || actionType === 'coup') {
                const action = {
                    type: actionType,
                    userId: currentPlayer.playerProfile.user._id.toString(),
                    targetUserId: targetUserId || null,
                    claimedRole: getClaimedRole(actionType),
                };
                const result = await executeAction(game, action);
                advanceTurn(game);
                await game.save();

                await emitGameUpdate(gameId);

                return callback?.({ success: true, message: 'Action executed successfully' });
            }

            // For other actions, check if they can be blocked or challenged
            const canBeBlocked = canActionBeBlocked(actionType);
            const canBeChallenged = canActionBeChallenged(actionType);

            // Set pending action
            game.pendingAction = {
                type: actionType,
                userId: currentPlayer.playerProfile.user._id.toString(),
                targetUserId: targetUserId || null,
                claimedRole: getClaimedRole(actionType),
                canBeBlocked: canBeBlocked,
                canBeChallenged: canBeChallenged,
                blockers: [],
                challenged: false,
            };
            await game.save();
            await emitGameUpdate(gameId);

            // Set a timeout to auto-execute the action after 30 seconds if no response
            setActionTimeout(gameId, async () => {
                const updatedGame = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                });

                if (updatedGame && updatedGame.pendingAction && !updatedGame.pendingAction.challenged) {
                    const pending = updatedGame.pendingAction;
                    if (pending.blockers.length === 0) {
                        const result = await executeAction(updatedGame, pending);
                        updatedGame.pendingAction = null;
                        advanceTurn(updatedGame);
                        await updatedGame.save();

                        // Emit gameUpdate
                        await emitGameUpdate(gameId);
                    } else {
                        // Handle blocked action
                        updatedGame.pendingAction = null;
                        advanceTurn(updatedGame);
                        await updatedGame.save();

                        // Emit gameUpdate
                        await emitGameUpdate(gameId);
                    }
                }
            }, 30000); // 30 seconds

            callback?.({ success: true, message: 'Action initiated, awaiting responses' });
        } catch (error) {
            console.error('Action Error:', error);
            callback?.({ success: false, message: 'Server Error', error: error.message });
        }
    });

    socket.on('exchange', async ({ gameId }, callback) => {
        try {
            const userId = socket.user.id;
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
    
            if (!game) {
                return callback?.({ success: false, message: 'Game not found' });
            }
    
            const currentPlayer = game.players[game.currentPlayerIndex];
            if (currentPlayer.playerProfile.user._id.toString() !== userId) {
                return callback?.({ success: false, message: 'Not your turn' });
            }
    
            if (!currentPlayer.isAlive) {
                return callback?.({ success: false, message: 'You are not alive in this game' });
            }
    
            if (game.pendingAction) {
                return callback?.({ success: false, message: 'Another action is already pending' });
            }
    
            const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
    
            if (!player || !player.isAlive) {
                return callback?.({ success: false, message: 'Player not found or not alive' });
            }
    
            if (game.deck.length < 2) {
                return callback?.({ success: false, message: 'Not enough cards in the deck to exchange' });
            }
    
            // Draw two cards from the deck
            const newCards = game.deck.splice(0, 2);
    
            // Combine with player's current characters
            const combinedCards = [...player.characters, ...newCards];
    
            // Set pending action
            game.pendingAction = {
                type: 'exchange',
                userId: userId,
                exchange: {
                    combinedCards,
                },
                canBeBlocked: false,
                canBeChallenged: true,
                challenged: false,
                accepted: false,
                claimedRole: 'Ambassador',
            };
    
            await game.save();
    
            await emitGameUpdate(gameId);
    
            // Set a timeout for accepting the exchange action
            setActionTimeout(gameId, async () => {
                const updatedGame = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                });
    
                if (updatedGame && updatedGame.pendingAction && updatedGame.pendingAction.type === 'exchange') {
                    // If the timeout is reached, mark the action as accepted
                    updatedGame.pendingAction.accepted = true;
                    await updatedGame.save();
    
                    // Emit gameUpdate
                    await emitGameUpdate(gameId);

                    // Set another timeout for selecting cards
                    setActionTimeout(gameId, async () => {
                        const finalGame = await Game.findById(gameId).populate({
                            path: 'players.playerProfile',
                            populate: { path: 'user' }
                        });

                        if (finalGame && finalGame.pendingAction && finalGame.pendingAction.type === 'exchange') {
                            // If cards weren't selected, automatically select the first two
                            const selectedCards = finalGame.pendingAction.exchange.combinedCards.slice(0, 2);
                            const result = await handleExchange(finalGame, userId, selectedCards);

                            if (result.success) {
                                finalGame.pendingAction = null;
                                advanceTurn(finalGame);
                                await finalGame.save();
                                await emitGameUpdate(gameId);
                            }
                        }
                    }, 30000); // 30 seconds timeout for card selection
                }
            }, 30000); // 30 seconds timeout for action acceptance
    
            callback?.({ success: true, message: 'Exchange action initiated' });
        } catch (error) {
            console.error('Exchange Error:', error);
            callback?.({ success: false, message: 'Server Error during exchange', error: error.message });
        }
    });
    
    // Handle Selection of Exchange Cards
    socket.on('selectExchangeCards', async ({ gameId, selectedCards }, callback) => {
        try {
            const userId = socket.user.id;
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
    
            if (!game || !game.pendingAction || game.pendingAction.type !== 'exchange' || game.pendingAction.userId.toString() !== userId) {
                return callback?.({ success: false, message: 'No pending exchange action found' });
            }
    
            const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
            if (!player || !player.isAlive) {
                return callback?.({ success: false, message: 'Player not found or not alive' });
            }
    
            if (!game.pendingAction.accepted) {
                return callback?.({ success: false, message: 'Exchange action has not been accepted yet' });
            }
    
            const result = await handleExchange(game, userId, selectedCards);
    
            if (result.success) {
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();
                await emitGameUpdate(gameId);
                clearActionTimeout(gameId);
                callback?.({ success: true, message: result.message });
            } else {
                callback?.({ success: false, message: result.message });
            }
        } catch (error) {
            console.error('Select Exchange Cards Error:', error);
            callback?.({ success: false, message: 'Server Error during selecting exchange cards', error: error.message });
        }
    });

    // Handle Block
    socket.on('block', async ({ gameId, actionType, blockerId }, callback) => {
        try {
            const userId = socket.user.id;
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });

            if (!game || !game.pendingAction) {
                return callback?.({ success: false, message: 'No pending action to block' });
            }

            const action = game.pendingAction;

            // Ensure the action can be blocked
            if (!action.canBeBlocked || action.type !== actionType) {
                return callback?.({ success: false, message: 'This action cannot be blocked' });
            }

            // Verify that the blocker is not the acting player
            if (action.userId === blockerId) {
                return callback?.({ success: false, message: 'You cannot block your own action' });
            }

            // Verify that the blocker is a valid player
            const blocker = game.players.find(p => p.playerProfile.user._id.toString() === blockerId.toString());
            if (!blocker || !blocker.isAlive) {
                return callback?.({ success: false, message: 'Blocker not found or not alive' });
            }

            // Add blocker to the list of blockers if not already blocked
            if (!action.blockers.includes(blockerId)) {
                action.blockers.push(blockerId);
                action.blockPending = true;  // Add this flag to indicate a pending block
                await game.save();
                await emitGameUpdate(gameId);

                callback?.({ success: true, message: 'Block attempted, waiting for acting player response' });
            } else {
                return callback?.({ success: false, message: 'Action already blocked by this user' });
            }
        } catch (error) {
            console.error('Block Error:', error);
            callback?.({ success: false, message: 'Server Error during block', error: error.message });
        }
    });

    // Handle Challenge
    socket.on('challenge', async ({ gameId }, callback) => {
        try {
            const challengerId = socket.user.id;
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });

            if (!game || !game.pendingAction) {
                return callback?.({ success: false, message: 'No pending action to challenge' });
            }

            const action = game.pendingAction;

            // Check if the action has already been challenged
            if (action.challenged) {
                return callback?.({ success: false, message: 'This action has already been challenged' });
            }

            const challengedPlayer = game.players.find(p => p.playerProfile.user._id.toString() === action.userId.toString());
            const challengedRole = action.claimedRole;

            if (!challengedPlayer || !challengedPlayer.isAlive) {
                return callback?.({ success: false, message: 'Challenged player not found or not alive' });
            }

            const challenger = game.players.find(p => p.playerProfile.user._id.toString() === challengerId.toString());
            if (!challenger || !challenger.isAlive) {
                return callback?.({ success: false, message: 'Challenger not found or not alive' });
            }
            
            // Check if the challenged player actually has the claimed role
            const hasRole = challengedPlayer.characters.includes(challengedRole);

            // Mark the action as challenged
            action.challenged = true;

            // Start of Selection
            if (hasRole) { // Challenger is wrong
                // Challenger loses an influence
                if (action.type === 'assassinate') {
                    // Remove two influences for failed assassin challenge
                    removeRandomCharacter(challenger);
                    removeRandomCharacter(challenger);
                } else {
                    removeRandomCharacter(challenger);
                }
                
                // Card Exchange Mechanism
                // Draw a new card from the deck
                if (game.deck.length === 0) {
                    return callback?.({ success: false, message: 'No more cards in the deck to exchange.' });
                }
                const newCard = game.deck.shift();
                
                // Add the new card to the challenged player's characters
                const cards = [...challengedPlayer.characters, newCard];
                
                // Set up exchange combinedCards for user selection
                action.originalAction = game.pendingAction.type;
                action.type = 'challengeSuccess';
                action.exchange = {
                    combinedCards: cards
                };
                action.challengerId = challengerId;
                
                
                await game.save();
                await emitGameUpdate(gameId);

                return callback?.({ success: true, message: 'Challenge failed. Please select cards to keep for exchange.' });
            } else { // Challenged player does not have the claimed role
                // Challenged player loses an influence
                removeRandomCharacter(challengedPlayer);

                // Invalidate pending action
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();
                await emitGameUpdate(gameId);

                callback?.({ success: true, message: 'Challenge successful. Challenged player lost an influence.' });
            }
        } catch (error) {
            console.error('Challenge Error:', error);
            callback?.({ success: false, message: 'Server Error during challenge', error: error.message });
        }
    });

    // Handle Respond to Block
    socket.on('respondToBlock', async ({ gameId, response }, callback) => {
        try {
            const userId = socket.user.id;
            const game = await Game.findById(gameId).populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
            });

            if (!game || !game.pendingAction || !game.pendingAction.blockPending) {
                return callback?.({ success: false, message: 'No pending block to respond to' });
            }

            const action = game.pendingAction;

            const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
            if (!player || !player.isAlive) {
                return callback?.({ success: false, message: 'Player not found or not alive' });
            }

            // Clear the timeout as the user is responding to the block
            clearActionTimeout(gameId);

            if (response === 'challenge') {
                // Initiate a challenge against the first blocker]
                const blockerId = action.blockers[0];
                const blocker = game.players.find(p => p.playerProfile.user._id.toString() === blockerId.toString());
                if (!blocker || !blocker.isAlive) {
                    return callback?.({ success: false, message: 'Blocker not found or not alive' });
                }

                // Check if blocker has the required role
                const requiredRoles = getBlockingRoles(action.type);
                const hasRole = blocker.characters.some(char => requiredRoles.includes(char));

                if (hasRole) {
                    // Challenger loses an influence
                    const challenger = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
                    if (challenger) {
                        removeRandomCharacter(challenger);
                    }

                    // The block succeeds
                    game.pendingAction = null;
                    advanceTurn(game);
                    await game.save();

                    await emitGameUpdate(gameId);
                } else {
                    // Blocker loses an influence
                    removeRandomCharacter(blocker);

                    // The original action proceeds
                    const result = await executeAction(game, action);
                    game.pendingAction = null;
                    advanceTurn(game);
                    await game.save();

                    await emitGameUpdate(gameId);
                }

                callback?.({ success: true, message: 'Response to block processed' });
            } else if (response === 'accept') {
                // Block is accepted, cancel the original action
                game.pendingAction = null;
                advanceTurn(game);
                await game.save();

                await emitGameUpdate(gameId);

                callback?.({ success: true, message: 'Response to block processed' });
            } else {
                return callback?.({ success: false, message: 'Invalid response to block' });
            }
        } catch (error) {
            console.error('Respond to Block Error:', error);
            callback?.({ success: false, message: 'Server Error during block response', error: error.message });
        }
    });

    // Handle Accept Action (No challenges or blocks)
    socket.on('acceptAction', async ({ gameId }, callback) => {
        try {
            const userId = socket.user.id;
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });
            if (!game || !game.pendingAction) {
                return callback?.({ success: false, message: 'No pending action to accept' });
            }

            const action = game.pendingAction;
            const actingPlayerId = action.userId.toString();

            // Prevent the acting player from accepting
            if (userId.toString() === actingPlayerId) {
                return callback?.({ success: false, message: 'Acting player does not need to accept their own action.' });
            }

            // Check if the user is already in the acceptedPlayers list
            if (action.acceptedPlayers.includes(userId)) {
                return callback?.({ success: false, message: 'You have already accepted this action.' });
            }

            // Add userId to acceptedPlayers
            action.acceptedPlayers.push(userId);
            await game.save();

            // Determine required number of accepts
            const requiredAccepts = game.players.length - 1; // All except acting player

            // Emit game update to all players
            await emitGameUpdate(gameId);

            // Check if all required players have accepted
            if (action.acceptedPlayers.length >= requiredAccepts) {
                // Clear the timeout as all have accepted
                clearActionTimeout(gameId);

                if (action.type === 'exchange') {
                    // Mark the action as accepted
                    action.accepted = true;
                    await game.save();

                    // Set a timeout for selecting cards
                    setActionTimeout(gameId, async () => {
                        const updatedGame = await Game.findById(gameId).populate({
                            path: 'players.playerProfile',
                            populate: { path: 'user' }
                        });

                        if (updatedGame && updatedGame.pendingAction && updatedGame.pendingAction.type === 'exchange') {
                            // If cards weren't selected, automatically select the first two
                            const selectedCards = updatedGame.pendingAction.exchange.combinedCards.slice(0, 2);
                            const result = await handleExchange(updatedGame, userId, selectedCards);

                            if (result.success) {
                                updatedGame.pendingAction = null;
                                advanceTurn(updatedGame);
                                await updatedGame.save();
                                await emitGameUpdate(gameId);
                                console.log('Exchange completed automatically due to timeout');
                            }
                        }
                    }, 30000); // 30 seconds timeout for card selection

                    return callback?.({ success: true, message: 'Exchange action accepted by all players, waiting for card selection.' });
                } else {
                    // Execute the action for non-exchange actions
                    const result = await executeAction(game, action);
                    game.pendingAction = null;
                    advanceTurn(game);
                    await game.save();
                    emitGameUpdate(gameId);
                    return callback?.({ success: true, message: 'Action executed after all players accepted.' });
                }
            } else {
                // Not all players have accepted yet
                return callback?.({ success: true, message: `Action accepted by ${action.acceptedPlayers.length}/${requiredAccepts} players.` });
            }
        } catch (error) {
            console.error('Accept Action Error:', error);
            callback?.({ success: false, message: 'Server Error during accept action', error: error.message });
        }
    });

    socket.on('challengeSuccess', async ({ gameId, cards }, callback) => {
        try {
            const userId = socket.user.id;
            if (!userId) {
                return callback({ success: false, message: 'User not connected.' });
            }

            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });

            if (!game) {
                return callback({ success: false, message: 'Game not found.' });
            }

            const pendingAction = game.pendingAction;
            if (
                !pendingAction ||
                pendingAction.type !== 'challengeSuccess' ||
                pendingAction.userId.toString() !== userId.toString()
            ) {
                return callback({ success: false, message: 'No pending challengeSuccess action found for this user.' });
            }

            const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
            if (!player || !player.isAlive) {
                return callback({ success: false, message: 'Player not found in the game or not alive.' });
            }

            if (!Array.isArray(cards)) {
                return callback({ success: false, message: 'Invalid cards format. Cards should be an array.' });
            }

            if (cards.length !== player.characters.length) {
                return callback({ success: false, message: `You must select exactly ${player.characters.length} card(s).` });
            }

            const validRoles = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
            for (const card of cards) {
                if (!validRoles.includes(card)) {
                    return callback({ success: false, message: `Invalid card role: ${card}.` });
                }
            }

            player.characters = cards;

            if (player.characters.length === 0) {
                player.isAlive = false;
            }

            // Change the type of the pending action to the original action
            pendingAction.type = pendingAction.originalAction;
            delete pendingAction.originalAction;

            const result = await executeAction(game, pendingAction);
            if (result.success) {
                advanceTurn(game);
                await game.save();
            }

            game.pendingAction = null;

            await game.save();

            await emitGameUpdate(gameId);

            callback({ success: true, message: 'Challenge success processed successfully.', game: game });
        } catch (error) {
            console.error('challengeSuccess Error:', error);
            callback({ success: false, message: 'Server Error during challenge success.', error: error.message });
        }
    });

    const setNewPendingAction = async (gameId, action) => {
        const game = await Game.findById(gameId).populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        });
        if (!game) return;

        // Initialize pendingAction with acceptedPlayers reset
        game.pendingAction = {
            ...action,
            acceptedPlayers: []
        };
        await game.save();

        // Emit game update to all players
        await emitGameUpdate(gameId);

        // Set action timeout if necessary
        setActionTimeout(gameId, async () => {
            // Handle timeout logic
            // Execute the action if not already executed
        }, 30000); // 30 seconds

        return;
    };


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

    const emitGameUpdate = async (gameId) => {
        try {
            // Fetch the latest game state
            const gameState = await Game.findById(gameId)
                .populate({
                    path: 'players.playerProfile',
                    populate: { path: 'user' }
                })
                .lean();
    
            if (!gameState) {
                console.warn(`Game ${gameId} not found during emitGameUpdate.`);
                return;
            }
    
            const winner = checkGameOver(gameState);
            if (winner) {
                gameState.status = 'finished';
                gameState.winner = winner;
            }
    
            // Format game data for each user
            const room = io.sockets.adapter.rooms.get(gameId);
            if (room && room.size > 0) {
                for (const socketId of room) {
                    const socketToEmit = io.sockets.sockets.get(socketId);
                    if (socketToEmit && socketToEmit.user && socketToEmit.user.id) {
                        const formattedGame = formatGameData(gameState, socketToEmit.user.id);
                        socketToEmit.emit('gameUpdate', formattedGame);
                    }
                }
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

    // Handle Restart Game
    socket.on('restartGame', async ({ gameId }, callback) => {
        try {
            const game = await Game.findById(gameId).populate({
                path: 'players.playerProfile',
                populate: { path: 'user' }
            });

            if (!game) {
                return callback?.({ success: false, message: 'Game not found.' });
            }

            if (game.status !== 'finished') {
                return callback?.({ success: false, message: 'Game is not finished yet.' });
            }

            // Reset game state
            game.players.forEach(player => {
                player.coins = 2;
                player.isAlive = true;
                player.isConnected = true;
                player.characters = []; // Will reassign characters below
            });

            // Reinitialize the deck
            game.deck = initializeDeck(game.maxPlayers);

            // Assign new characters to players
            game.players.forEach(player => {
                const charactersPerPlayer = game.maxPlayers <= 4 ? 2 : 3;
                const newCharacters = game.deck.splice(0, charactersPerPlayer);
                player.characters = newCharacters;
            });

            game.centralTreasury = 1000; // Reset treasury
            game.status = 'in_progress';
            game.currentPlayerIndex = 0;
            game.currentPlayerUsername = '';
            game.winner = null;
            game.pendingAction = null;

            await game.save();

            // Emit game update to all players
            await emitGameUpdate(gameId);

            callback?.({ success: true, message: 'Game has been restarted.', game });
        } catch (error) {
            console.error('Restart Game Error:', error);
            callback?.({ success: false, message: 'Server Error during game restart.', error: error.message });
        }
    });
};

module.exports = { gameSockets };