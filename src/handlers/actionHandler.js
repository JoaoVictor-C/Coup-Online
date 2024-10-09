const Game = require('../models/Game');
const { emitGameUpdate, handleExchange, executeAction, advanceTurn } = require('../services/gameService');
const { getClaimedRole, canActionBeBlocked, canActionBeChallenged } = require('../services/actionService');
const { setActionTimeout, clearActionTimeout } = require('../services/timerService');

const handleAction = async (io, socket, gameId, actionType, targetUserId, callback) => {
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

        if (actionType === 'steal' || actionType === 'assassinate' || actionType === 'coup') {
            if (!targetUserId) {
                return callback?.({ success: false, message: 'Target user ID is required for this action.' });
            }
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
            if (result.success) {
                advanceTurn(game);
                await game.save();

                await emitGameUpdate(gameId, io);
                
                io.to(gameId).emit('lastAction', {
                    username: currentPlayer.playerProfile.user.username,
                    userId: currentPlayer.playerProfile.user._id.toString(),
                    action: actionType,
                    targetUserId: targetUserId || null,
                    message: actionType === 'income' ? 'Gained 1 coin.' : `Performed a coup on ${targetUsername}.`,
                });
            }
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
            accepted: false,
            acceptedPlayers: [],
            challengerId: null,
            blockPending: false,
        };
        await game.save();
        await emitGameUpdate(gameId, io);

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
                    if (result.success) {
                        updatedGame.pendingAction = null;
                        advanceTurn(updatedGame);
                        await updatedGame.save();

                        // Emit gameUpdate
                        await emitGameUpdate(gameId, io);
                        io.to(gameId).emit('lastAction', {
                            username: currentPlayer.playerProfile.user.username,
                            userId: currentPlayer.playerProfile.user._id.toString(),
                            action: actionType,
                            targetUserId: targetUserId || null,
                        });
                    }
                } else {
                    // Handle blocked action
                    updatedGame.pendingAction = null;
                    advanceTurn(updatedGame);
                    await updatedGame.save();

                    // Emit gameUpdate
                    await emitGameUpdate(gameId, io);

                    io.to(gameId).emit('lastAction', {
                        username: currentPlayer.playerProfile.user.username,
                        userId: currentPlayer.playerProfile.user._id.toString(),
                        action: actionType,
                        targetUserId: targetUserId || null,
                    });
                }
            }
        }, 30000); // 30 seconds

        callback?.({ success: true, message: 'Action initiated, awaiting responses' });
    } catch (error) {
        console.error('Action Error:', error);
        callback?.({ success: false, message: 'Server Error', error: error.message });
    }
}

const handleAcceptAction = async (io, socket, gameId, callback) => {
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

        // Check if targetUserId is needed and then if it is valid
        if (action.type === 'steal' || action.type === 'assassinate' || action.type === 'coup') {
            if (!action.targetUserId) {
                return callback?.({ success: false, message: 'Invalid target user ID.' });
            }
        }

        // Add userId to acceptedPlayers
        action.acceptedPlayers.push(userId);
        await game.save();

        // Determine required number of accepts excluding dead players
        const requiredAccepts = game.players.filter(player => player.isAlive).length - 1;

        // Emit game update to all players
        await emitGameUpdate(gameId, io);

        const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());

        io.to(gameId).emit('lastAction', {
            username: player.playerProfile.user.username,
            userId: player.playerProfile.user._id.toString(),
            action: action.type,
            targetUserId: null,
        });

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
                            await emitGameUpdate(gameId, io);
                            io.to(gameId).emit('lastAction', {
                                username: player.playerProfile.user.username,
                                userId: player.playerProfile.user._id.toString(),
                                action: action.type || null,
                                targetUserId: null,
                                message: 'Exchange action accepted by all players, waiting for card selection.',
                            });
                            console.log('Exchange completed automatically due to timeout');
                        }
                    }
                }, 30000); // 30 seconds timeout for card selection
                
                await emitGameUpdate(gameId, io);

                return callback?.({ success: true, message: 'Exchange action accepted by all players, waiting for card selection.' });
            } else {
                // Execute the action for non-exchange actions
                const result = await executeAction(game, action);
                if (result.success) {
                    game.pendingAction = null;
                    advanceTurn(game);
                    await game.save();
                    await emitGameUpdate(gameId, io);
                    io.to(gameId).emit('lastAction', {
                        username: player.playerProfile.user.username,
                        userId: player.playerProfile.user._id.toString(),
                        action: action.type,
                        targetUserId: null,
                        message: 'Action executed after all players accepted.',
                    });
                }
                await emitGameUpdate(gameId, io)
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
}


module.exports = { handleAction, handleAcceptAction };