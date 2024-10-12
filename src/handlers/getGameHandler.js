const Game = require('../models/Game');
const { formatGameData } = require('../services/gameService');

const handleGetGame = async (io, socket, roomName, userId, callback) => {
    try {
        const game = await Game.findOne({ roomName })
            .populate({
                path: 'players.playerProfile',
                populate: { path: 'user', select: 'username email' } // Select only necessary fields
            })
            .lean(); // Use lean for better performance

        if (!game) {
            return callback({ success: false, message: 'Game not found' });
        }

        const formattedGame = formatGameData(game, userId);
        callback({ success: true, game: formattedGame });
    } catch (error) {
        console.error('getGame Error:', error);
        callback({ success: false, message: 'Server Error fetching game data.' });
    }
}

module.exports = { handleGetGame };