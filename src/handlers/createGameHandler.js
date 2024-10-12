const { initializeDeck, addUserToGame, emitGameUpdate } = require('../services/gameService');
const Game = require('../models/Game');
const PlayerProfile = require('../models/PlayerProfile');

const handleCreateGame = async (io, socket, playerCount, callback, connectedUsers, userGames) => {
    try {
        // Validate playerCount
        if (playerCount < 2 || playerCount > 6) {
            return callback({ success: false, message: 'Player count must be between 2 and 6.' });
        }

        const userId = socket.user.id;
        const playerProfile = await PlayerProfile.findOne({ user: userId })
            .populate('user', 'username email')
            .lean();

        if (!playerProfile) {
            return callback({ success: false, message: 'Player profile not found.' });
        }

        // Initialize and shuffle the deck
        const deck = initializeDeck(playerCount);

        // Create new game
        const newGame = new Game({
            roomName: `room_${Date.now()}`, // Generate unique roomName
            players: [],
            deck: deck,
            maxPlayers: playerCount,
            status: 'waiting',
            centralTreasury: 1000,
            currentPlayerIndex: 0,
        });

        // Add creator to the game
        const result = await addUserToGame(newGame, playerProfile);
        if (!result.success) {
            return callback({ success: false, message: result.message });
        }

        // Save the game
        await newGame.save();

        // Update tracking objects
        connectedUsers[userId] = socket.id;
        userGames[socket.id] = newGame._id.toString();

        // Join Socket.IO room
        socket.join(newGame.roomName);

        // Emit game update
        await emitGameUpdate(newGame._id, io);

        callback({ success: true, game: newGame });
    } catch (error) {
        console.error('createGame Error:', error);
        callback({ success: false, message: 'Server Error while creating game.' });
    }
};

module.exports = { handleCreateGame };