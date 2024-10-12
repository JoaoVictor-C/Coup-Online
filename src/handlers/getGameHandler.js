const Game = require('../models/Game');
const { formatGameData } = require('../services/gameService');

const handleGetGame = async (io, socket, roomName, userId, callback) => {
    try {
        const game = await Game.findOne({ roomName }).populate({
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
}

module.exports = { handleGetGame };