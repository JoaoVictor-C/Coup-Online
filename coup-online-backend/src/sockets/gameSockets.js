const Game = require('../models/Game');
const User = require('../models/User');
const { handleIncome } = require('../services/gameService');

module.exports = (io, socket) => {
    // Join a game room
    socket.on('joinGame', async ({ gameId, userId }) => {
        socket.join(gameId);
        // Additional logic to handle joining
        const game = await Game.findById(gameId).populate('players.user');
        io.to(gameId).emit('gameUpdate', game);
    });

    // Handle player actions
    socket.on('playerAction', async ({ gameId, action, details }) => {
        // Process action using Game Logic
        let result;
        switch(action) {
            case 'income':
                result = await handleIncome(gameId, details.userId);
                break;
            // Handle other actions...
            default:
                result = { success: false, message: 'Unknown action' };
        }

        // Fetch the updated game state
        const updatedGame = await Game.findById(gameId).populate('players.user');
        if(result.success){
            io.to(gameId).emit('gameUpdate', updatedGame);
        } else {
            socket.emit('actionError', { message: result.message });
        }
    });

    // Handle challenges
    socket.on('challengeAction', async ({ gameId, challengerId, actionId }) => {
        // Process challenge
        io.to(gameId).emit('challengeResult', { /* result */ });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        // Handle player disconnection
    });
};