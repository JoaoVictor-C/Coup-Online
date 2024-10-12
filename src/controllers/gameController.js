const Game = require('../models/Game');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const { 
    initializeDeck, 
    addUserToGame, 
    formatGameData,
} = require('../services/gameService');
const { setActionTimeout, clearActionTimeout } = require('../services/timerService');

const createGame = async (req, res) => {
    try {
        const userId = req.user.id;
        const { playerCount } = req.body;
        if (playerCount < 2 || playerCount > 6) {
            return res.status(400).json({ message: 'Invalid player count. Must be between 2 and 6.' });
        }
        // Retrieve the player's profile
        const playerProfile = await PlayerProfile.findOne({ user: userId })
            .populate('user', 'username email') // Select only necessary fields
            .lean(); // Use lean for better performance
        if (!playerProfile) {
            return res.status(404).json({ message: 'Player profile not found' });
        }
        const user = playerProfile.user;
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Initialize and shuffle the deck based on playerCount
        const deck = initializeDeck(playerCount);
        // Create a new game instance
        const newGame = new Game({
            players: [],
            deck: deck,
            maxPlayers: playerCount,
            status: 'waiting',
            centralTreasury: 1000,
            currentPlayerIndex: 0,
        });
        // Add the creator to the game
        const result = await addUserToGame(newGame, playerProfile);
        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }
        // Populate necessary fields
        const populatedGame = await Game.findById(result.game._id)
            .populate({
                path: 'players.playerProfile',
                populate: { path: 'user', select: 'username email' }
            })
            .lean(); // Use lean for better performance
        res.status(201).json({ message: 'Game created successfully', game: populatedGame });
    } catch (error) {
        console.error('createGame Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getGameState = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.user.id;
        const game = await Game.findById(gameId)
            .populate({
                path: 'players.playerProfile',
                populate: { path: 'user', select: 'username email' }
            })
            .lean(); // Use lean for better performance
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const formattedGame = formatGameData(game, userId);
        res.status(200).json({ game: formattedGame });
    } catch (error) {
        console.error('getGameState Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const handleDisconnection = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.user.id;
        const game = await Game.findById(gameId)
            .populate({
                path: 'players.playerProfile',
                populate: { path: 'user', select: 'username email' }
            })
            .lean(); // Use lean for better performance
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
        if (!player) {
            return res.status(404).json({ message: 'Player not found in the game' });
        }
        // Mark player as disconnected
        await Game.findByIdAndUpdate(gameId, { 'players.$[elem].isConnected': false }, {
            arrayFilters: [{ 'elem.playerProfile': player.playerProfile._id }],
            new: true
        });
        // Check if game should be finished
        const updatedGame = await Game.findById(gameId).lean();
        const connectedPlayers = updatedGame.players.filter(p => p.isAlive && p.isConnected);
        if (connectedPlayers.length <= 1) {
            await Game.findByIdAndUpdate(gameId, { status: 'finished', winner: connectedPlayers[0]?.playerProfile.username || null });
        }
        res.status(200).json({ message: 'Player marked as disconnected from the game' });
        // Optionally notify other players via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(gameId).emit('playerDisconnected', { userId, gameId });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createGame,
    getGameState,
    handleDisconnection,
};