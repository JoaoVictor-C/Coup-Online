const Game = require('../models/Game');
const { initializeDeck, emitGameUpdate, startGameLogic } = require('../services/gameService');

const handleStartGame = async (io, socket, gameId, callback) => {
    try {
        // Retrieve the game and check status
        const game = await Game.findById(gameId).lean();
        if (!game) {
            return callback?.({ success: false, message: 'Game not found.' });
        }

        if (game.status !== 'waiting') {
            return callback?.({ success: false, message: 'Game cannot be started in its current state.' });
        }

        // Execute game start logic
        const response = await startGameLogic(gameId, socket.user.id, io);

        if (!response.success) {
            return callback?.({ success: false, message: response.message });
        }

        // Emit game update
        await emitGameUpdate(gameId, io);

        callback?.({ success: true, message: 'Game started successfully', game: response.game });
    } catch (error) {
        console.error('startGame Error:', error);
        callback?.({ success: false, message: 'Failed to start game' });
    }
};

module.exports = { handleStartGame };