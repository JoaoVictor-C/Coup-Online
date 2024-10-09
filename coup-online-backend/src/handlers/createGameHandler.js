const { initializeDeck, addUserToGame, emitGameUpdate } = require('../services/gameService');
const PlayerProfile = require('../models/PlayerProfile');
const Game = require('../models/Game');

const handleCreateGame = async (io, socket, playerCount, callback, connectedUsers, userGames) => {
    try {
        const userId = socket.user.id; // Extracted from authenticated socket
        const playerProfile = await PlayerProfile.findOne({ user: userId }).populate('user');

        if (!playerProfile) {
            return callback({ success: false, message: 'Player profile not found' });
        }

        // Initialize the deck based on the number of players
        const deck = initializeDeck(playerCount);

        // Generate a random room name 5 random capital letters, is need to be unique
        let roomName = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        do {
            roomName = '';
            for (let i = 0; i < 4; i++) {
                roomName += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (await Game.exists({ roomName: roomName }));

        const newGame = new Game({
            roomName: roomName,
            maxPlayers: playerCount,
            status: 'waiting',
            players: [],
            deck: deck,
            centralTreasury: 1000, // Initial treasury value, adjust as needed
        });

        await newGame.save();

        // Add the creator to the game
        const addUserResult = await addUserToGame(newGame, playerProfile);
        if (!addUserResult.success) {
            return callback({ success: false, message: addUserResult.message });
        }

        const populatedGame = await Game.findById(newGame._id).populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        });

        await populatedGame.save();

        socket.join(populatedGame._id.toString());
        connectedUsers[userId] = socket.id;
        userGames[socket.id] = populatedGame._id.toString();

        // Emit game update to all players in the room
        await emitGameUpdate(populatedGame._id, io);

        callback({ success: true, game: populatedGame });
    } catch (err) {
        console.error(err);
        callback({ success: false, message: 'Server Error' });
    }
};

module.exports = { handleCreateGame };