const { initializeDeck, addUserToGame, emitGameUpdate } = require('../services/gameService');
const PlayerProfile = require('../models/PlayerProfile');
const Game = require('../models/Game');

const handleJoinGame = async (io, socket, roomName, callback, connectedUsers, userGames) => {
    try {
        const userId = socket.user.id; // Extracted from authenticated socket
        const game = await Game.findOne({ roomName: roomName }).populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        });
        if (!game) {
            return callback({ success: false, message: 'Game not found' });
        }

        const playerProfile = await PlayerProfile.findOne({ user: userId }).populate('user');
        if (!playerProfile) {
            return callback({ success: false, message: 'Player profile not found' });
        }

        const player = game.players.find(p => p.playerProfile.user._id.toString() === userId);
        if (player) {
            player.isConnected = true;
            await game.save();
            socket.join(game._id.toString());
            connectedUsers[userId] = socket.id;
            userGames[socket.id] = game._id.toString();
            await emitGameUpdate(game._id, io);
            return callback({ success: true, message: 'User reconnected to the game', game });
        }

        if (game.status !== 'waiting') {
            return callback({ success: false, message: 'Game has already started or finished' });
        }

        if (game.players.length >= game.maxPlayers) {
            return callback({ success: false, message: 'Game is full' });
        }

        const response = await addUserToGame(game, playerProfile);
        if (!response.success) {
            return callback({ success: false, message: response.message });
        }

        socket.join(game._id.toString());
        connectedUsers[userId] = socket.id;
        userGames[socket.id] = game._id.toString();

        await game.populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        });

        await emitGameUpdate(game._id, io);
        callback({ success: true, game: game });
    } catch (error) {
        console.error('joinGame Error:', error);
        callback({ success: false, message: 'Server Error' });
    }
};

module.exports = { handleJoinGame };