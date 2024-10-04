const Game = require('../models/Game');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const { initializeDeck } = require('../services/gameService');

const createGame = async (req, res) => {
    try {
        const userId = req.user.id;
        const { playerCount } = req.body;
        if (playerCount < 2 || playerCount > 6) {
            return res.status(400).json({ message: 'Invalid player count. Must be between 2 and 6.' });
        }
        // Retrieve the player's profile
        const playerProfile = await PlayerProfile.findOne({ user: userId }).populate('user');
        if (!playerProfile) {
            return res.status(404).json({ message: 'Player profile not found' });
        }
        const user = playerProfile.user;
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Initialize and shuffle the deck based on playerCount
        const deck = initializeDeck(playerCount);
        // Determine characters dealt per player
        let charactersPerPlayer;
        if (playerCount >= 2 && playerCount <= 4) {
            charactersPerPlayer = 2;
        } else if (playerCount > 4 && playerCount <= 6) {
            charactersPerPlayer = 3;
        } else {
            charactersPerPlayer = 2; // Default
        }
        // Create a new game instance
        const newGame = new Game({
            players: [{
                playerProfile: playerProfile.id,
                username: user.username,
                coins: 2,
                characters: [deck.pop(), deck.pop()],
                isAlive: true,
                isConnected: true,
            }],
            deck: deck,
            maxPlayers: playerCount,
            status: 'waiting',
            centralTreasury: 1000,
            currentPlayerIndex: 0,
            currentPlayerUsername: user.username,
        });
        // Save the game to the database
        await newGame.save();
        res.status(201).json(newGame);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

const joinGame = async (req, res) => {
    try {
        const { gameId } = req.body;
        const userId = req.user.id;
        const game = await Game.findById(gameId).populate('players.playerProfile.user');
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const playerProfile = await PlayerProfile.findOne({ user: userId });
        if (!playerProfile) {
            return res.status(404).json({ message: 'Player profile not found' });
        }
        const isAlreadyPlayer = game.players.some(player => player.playerProfile.toString() === playerProfile.id.toString());
        if (isAlreadyPlayer) {
            console.log('User is already in the game')
            return res.status(200).json({ message: 'User is already in the game', game: game });
        }
        if (game.status !== 'waiting') {
            return res.status(400).json({ message: 'Cannot join a game that has already started' });
        }
        if (game.players.length >= game.maxPlayers) {
            return res.status(400).json({ message: 'Game is already full' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const characters = [game.deck.pop(), game.deck.pop()];
        game.players.push({
            playerProfile: playerProfile.id,
            username: user.username,
            coins: 2,
            characters: characters,
            isAlive: true,
            isConnected: true,
        });
        await game.save();
        await User.findByIdAndUpdate(userId, { $push: { games: game.id } });
        const populatedGame = await Game.findById(game.id)
            .populate({
                path: 'players.playerProfile',
                select: 'user username',
                populate: {
                    path: 'user',
                    select: 'id username'
                }
            })
            .lean();
        
        // Hide other players' characters
        populatedGame.players = populatedGame.players.map(player => {
            if (player.playerProfile.user._id.toString() !== userId) {
                player.characters = player.characters.map(() => 'hidden');
            }
            return player;
        });

        res.status(200).json(populatedGame);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getGameState = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.user.id; 
        const game = await Game.findById(gameId)
            .populate({
                path: 'players.playerProfile',
                select: 'user username characters',
                populate: {
                    path: 'user',
                    select: 'id username'
                }
            })
            .lean();
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        // Check if user is part of the game
        const isPlayer = game.players.some(player => player.playerProfile.user._id.toString() === userId.toString());
        if (!isPlayer) {
            return res.status(403).json({ message: 'Access denied' });
        }
        game.players = game.players.map(player => {
            if (player.playerProfile.user._id.toString() !== userId.toString()) {
                player.characters = player.characters.map(() => 'hidden');
            }
            return player;
        });
        // Add the current player's username to the game object
        game.currentPlayerUsername = game.players[game.currentPlayerIndex].username;
        res.status(200).json(game);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

const handleDisconnection = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.user.id;
        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const player = game.players.find(p => p.playerProfile.toString() === userId.toString());
        if (!player) {
            return res.status(404).json({ message: 'Player not found in the game' });
        }
        // Mark player as disconnected
        player.isConnected = false;
        // Handle game status if necessary
        const connectedPlayers = game.players.filter(p => p.isAlive && p.isConnected);
        if (connectedPlayers.length <= 1) {
            game.status = 'finished';
            game.winner = connectedPlayers[0]?.playerProfile;
        }
        await game.save();
        res.status(200).json({ message: 'Player marked as disconnected from the game' });
        // Optionally notify other players via Socket.IO
        // You might need to integrate Socket.IO instance here or use a different approach
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

const startGame = async (req, res) => {
    const { gameId } = req.params;
    const userId = req.user.id;
    try {
        const game = await Game.findById(gameId).populate({
            path: 'players.playerProfile',
            select: 'user username characters',
            populate: {
                path: 'user',
                select: 'id username'
            }
        });
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const isPlayer = game.players.some(player =>
            player.playerProfile &&
            player.playerProfile.user &&
            player.playerProfile.user.id.toString() === userId.toString()
        );
        if (!isPlayer) {
            return res.status(403).json({ message: 'You are not a player in this game' });
        }
        if (game.status !== 'waiting') {
            return res.status(400).json({ message: 'Game has already started' });
        }
        if (game.players.length < 2) {
            return res.status(400).json({ message: 'At least 2 players are required to start the game' });
        }
        game.status = 'in_progress';
        game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
        game.currentPlayerUsername = game.players[game.currentPlayerIndex].username;
        await game.save();
        const updatedGame = await Game.findById(gameId).populate({
            path: 'players.playerProfile',
            populate: {
                path: 'user',
                select: 'id username'
            }
        });

        // Hide other players' characters
        updatedGame.players = updatedGame.players.map(player => {
            if (player.playerProfile.user._id.toString() !== userId) {
                player.characters = player.characters.map(() => 'hidden');
            }
            return player;
        });

        const io = req.app.get('io');
        if (io) {
            io.to(gameId).emit('gameUpdate', updatedGame);
        } else {
            console.warn('Socket.io instance not found in app');
        }
        res.status(200).json({ message: 'Game started successfully', game: updatedGame });
    } catch (err) {
        console.error('startGame Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
module.exports = {
    createGame,
    joinGame,
    getGameState,
    handleDisconnection,
    startGame,
};