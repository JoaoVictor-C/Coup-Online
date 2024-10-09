const Game = require('../models/Game');
const { emitGameUpdate, handleExchange, advanceTurn } = require('../services/gameService');
const { setActionTimeout, clearActionTimeout } = require('../services/timerService');

const handleExchangeAction = async (io, socket, gameId, callback) => {
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

        await emitGameUpdate(gameId, io);

        io.to(gameId).emit('lastAction', {
            username: currentPlayer.playerProfile.user.username,
            userId: currentPlayer.playerProfile.user._id.toString(),
            action: 'exchange',
            targetUserId: null,
            message: 'Initiated an exchange by drawing two new cards.',
        });

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
                await emitGameUpdate(gameId, io);

                io.to(gameId).emit('lastAction', {
                    username: currentPlayer.playerProfile.user.username,
                    userId: currentPlayer.playerProfile.user._id.toString(),
                    action: 'exchange',
                    targetUserId: null,
                    message: 'Exchange action accepted by all players, waiting for card selection.',
                });

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
                            await emitGameUpdate(gameId, io);
                            clearActionTimeout(gameId);
                            io.to(gameId).emit('lastAction', {
                                username: currentPlayer.playerProfile.user.username,
                                userId: currentPlayer.playerProfile.user._id.toString(),
                                action: 'exchange',
                                targetUserId: null,
                                message: 'Selected cards to keep after exchange.',
                            });
                            callback?.({ success: true, message: 'Exchange action completed successfully.' });
                        }
                    }
                }, 30000); // 30 seconds timeout for card selection
            }
        }, 30000); // 30 seconds timeout for action acceptance

        callback?.({ success: true, message: 'Exchange action initiated successfully.' });
    } catch (error) {
        console.error('Exchange Error:', error);
        callback?.({ success: false, message: 'Server Error during exchange', error: error.message });
    }
}

const handleSelectExchangeCards = async (io, socket, gameId, selectedCards, callback) => {
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
            await emitGameUpdate(gameId, io);
            clearActionTimeout(gameId);
            io.to(gameId).emit('lastAction', {
                username: player.playerProfile.user.username,
                userId: player.playerProfile.user._id.toString(),
                action: 'exchange',
                targetUserId: null,
                message: 'Selected cards to keep after exchange.',
            });
            callback?.({ success: true, message: result.message });
        } else {
            callback?.({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Select Exchange Cards Error:', error);
        callback?.({ success: false, message: 'Server Error during selecting exchange cards', error: error.message });
    }
}



module.exports = {
    handleExchangeAction,
    handleSelectExchangeCards
}