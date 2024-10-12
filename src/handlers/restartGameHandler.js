const Game = require('../models/Game');
const { initializeDeck, emitGameUpdate } = require('../services/gameService');
const { clearActionTimeout } = require('../services/timerService');

const handleRestartGame = async (io, socket, gameId, callback) => {
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
            player.deadCharacters = [];
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