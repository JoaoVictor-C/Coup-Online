// Start of Selection
const Game = require('../models/Game');
const { emitGameUpdate, removeRandomCharacter, advanceTurn, executeAction, shuffleArray } = require('../services/gameService');

const handleChallengeAction = async (io, socket, gameId, callback) => {
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
        
        // Check if the challenged player actually has the claimed role and the character is alive
        const hasRole = challengedPlayer.characters.includes(challengedRole) && !challengedPlayer.deadCharacters.includes(challengedRole);

        // Mark the action as challenged
        action.challenged = true;

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
                console.log('DEBUG LOG 1')
                return callback?.({ success: false, message: 'No more cards in the deck to exchange.' });
            }
            const newCard = game.deck.shift();
            
            // Add the new card to the challenged player's characters
            const combinedCards = [...challengedPlayer.characters, newCard];
            
            // Set up exchange combinedCards for user selection
            action.originalAction = game.pendingAction.type;
            action.type = 'challengeSuccess';
            action.exchange = {
                combinedCards: combinedCards
            };
            action.challengerId = challengerId;
            
            await game.save();
            await emitGameUpdate(gameId, io);
            io.to(gameId).emit('lastAction', {
                username: challenger.playerProfile.user.username,
                userId: challenger.playerProfile.user._id.toString(),
                action: 'challenge',
                targetUserId: action.userId.toString(),
                message: 'Challenge failed. Please select cards to keep for exchange.',
            });

            return callback?.({ success: true, message: 'Challenge failed. Please select cards to keep for exchange.' });
        } else { // Challenged player does not have the claimed role
            // Challenged player loses an influence
            removeRandomCharacter(challengedPlayer);

            // Invalidate pending action
            game.pendingAction = null;
            advanceTurn(game);
            await game.save();
            await emitGameUpdate(gameId, io);
            io.to(gameId).emit('lastAction', {
                username: challengedPlayer.playerProfile.user.username,
                userId: challengedPlayer.playerProfile.user._id.toString(),
                action: 'challenge',
                targetUserId: action.userId.toString(),
                message: 'Challenge successful. Challenged player lost an influence.',
            });

            callback?.({ success: true, message: 'Challenge successful. Challenged player lost an influence.' });
        }
    } catch (error) {
        console.error('Challenge Error:', error);
        callback?.({ success: false, message: 'Server Error during challenge', error: error.message });
    }
}

const handleChallengeSuccess = async (io, socket, gameId, cards, callback) => {
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

        const combinedCards = pendingAction.exchange.combinedCards;
        const originalCardCount = player.characters.length;

        if (cards.length !== originalCardCount) {
            return callback({ success: false, message: `You must select exactly ${originalCardCount} card(s).` });
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

        // Return other cards to the deck
        // Remove one instance of each selected card from combinedCards
        for (const card of cards) {
            const index = combinedCards.indexOf(card);
            if (index !== -1) {
                combinedCards.splice(index, 1);
            } else {
                // This should not happen, but handle gracefully
                return callback({ success: false, message: `Selected card "${card}" is not available in the combined cards` });
            }
        }

        // Shuffle and return the unused cards to the deck
        game.deck = shuffleArray([...game.deck, ...combinedCards]);

        // Change the type of the pending action to the original action
        pendingAction.type = pendingAction.originalAction;
        delete pendingAction.originalAction;
        delete pendingAction.exchange;
        delete pendingAction.challengerId;

        const result = await executeAction(game, pendingAction);
        if (result.success) {
            advanceTurn(game);
            game.pendingAction = null;
            await game.save();
            await emitGameUpdate(gameId, io);
            io.to(gameId).emit('lastAction', {
                username: player.playerProfile.user.username,
                userId: player.playerProfile.user._id.toString(),
                action: 'challengeSuccess',
                targetUserId: null,
                message: 'Challenge success processed successfully.',
            });
        }

        callback({ success: true, message: 'Challenge success processed successfully.', game: game });
    } catch (error) {
        console.error('challengeSuccess Error:', error);
        callback({ success: false, message: 'Server Error during challenge success.', error: error.message });
    }
}

module.exports = {
    handleChallengeAction,
    handleChallengeSuccess
};