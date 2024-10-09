const Game = require('../models/Game');
const { initializeDeck, emitGameUpdate, startGameLogic } = require('../services/gameService');

const handleStartGame = async (io, socket, gameId, callback) => {
    try {
        const response = await startGameLogic(gameId, socket.user.id, io);

        emitGameUpdate(gameId, io);

        if (!response.success) {
            return callback?.({ success: false, message: response.message });
        }


        callback?.({ success: true, message: 'Game started successfully', game: response.game });
    } catch (error) {
        console.error('startGame Error:', error);
        callback?.({ success: false, message: 'Failed to start game' });
    }
};

module.exports = { handleStartGame };