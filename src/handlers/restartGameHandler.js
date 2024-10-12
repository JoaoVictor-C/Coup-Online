const Game = require('../models/Game');
const { initializeDeck, emitGameUpdate } = require('../services/gameService');
const { clearActionTimeout } = require('../services/timerService');

const handleRestartGame = async (io, socket, gameId, callback) => {
    try {
        const game = await Game.findById(gameId).populate({
            path: 'players.playerProfile',
            populate: { path: 'user', select: 'username email' }
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
            player.characters = []; 
            player.deadCharacters = [];
        });

        // Initialize new deck and assign characters
        game.deck = initializeDeck(game.maxPlayers);
        const charactersPerPlayer = Math.floor(game.deck.length / game.players.length);
        game.players.forEach(player => {
            const newCharacters = game.deck.splice(0, charactersPerPlayer);
            player.characters = newCharacters;
        });

        game.centralTreasury = 1000;
        game.status = 'in_progress';
        game.currentPlayerIndex = 0;
        game.currentPlayerUsername = '';
        game.winner = null;
        game.pendingAction = null;

        // Clear the action timeouts
        clearActionTimeout(gameId);

        await game.save();

        // Emit game update to all players
        await emitGameUpdate(gameId, io);

        callback?.({ success: true, message: 'Game has been restarted.', game });
    } catch (error) {
        console.error('Restart Game Error:', error);
        callback?.({ success: false, message: 'Server Error during game restart.', error: error.message });
    }
}

module.exports = { handleRestartGame };