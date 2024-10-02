const Game = require('../models/Game');
const User = require('../models/User');
const { handleIncome } = require('../services/gameService');

/**
 * Create a new game
 */
const createGame = async (req, res) => {
    try {
        const userId = req.user._id;

        // Initialize a new game
        const game = new Game({
            players: [{ user: userId, isTurn: true, isAlive: true }],
            deck: initializeDeck(),
            centralTreasury: 50,
            status: 'waiting',
        });

        await game.save();

        // Add game to user's games list
        await User.findByIdAndUpdate(userId, { $push: { games: game._id } });

        res.status(201).json({
            message: 'Game created successfully',
            gameId: game._id,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Join an existing game
 */
const joinGame = async (req, res) => {
    try {
        const { gameId } = req.body;
        const userId = req.user._id;

        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        if (game.status !== 'waiting') {
            return res.status(400).json({ message: 'Cannot join a game that has already started' });
        }

        // Check if user is already in the game
        const isAlreadyPlayer = game.players.some(player => player.user.toString() === userId.toString());
        if (isAlreadyPlayer) {
            return res.status(400).json({ message: 'User is already in the game' });
        }

        // Add user to the game
        game.players.push({ user: userId, isTurn: false, isAlive: true });
        await game.save();

        // Add game to user's games list
        await User.findByIdAndUpdate(userId, { $push: { games: game._id } });

        // If minimum players reached, start the game
        if (game.players.length >= 2) { // Assuming 2 is minimum
            game.status = 'in_progress';
            initializePlayerCards(game);
            await game.save();
        }

        res.status(200).json({
            message: 'Joined game successfully',
            gameId: game._id,
            status: game.status,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Get game state
 */
const getGameState = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.user._id;

        const game = await Game.findById(gameId).populate('players.user', 'username');

        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // Check if user is part of the game
        const isPlayer = game.players.some(player => player.user._id.toString() === userId.toString());
        if (!isPlayer) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json({
            game,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Initialize the deck with standard Coup cards
 */
const initializeDeck = () => {
    const roles = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
    let deck = [];
    roles.forEach(role => {
        // Assuming 3 copies of each role
        for (let i = 0; i < 3; i++) {
            deck.push(role);
        }
    });
    // Shuffle the deck
    return shuffleArray(deck);
};

/**
 * Shuffle an array
 */
const shuffleArray = (array) => {
    return array.sort(() => Math.random() - 0.5);
};

/**
 * Initialize player cards
 */
const initializePlayerCards = (game) => {
    game.players = game.players.map(player => {
        player.characters = [game.deck.pop(), game.deck.pop()];
        return player;
    });
};

module.exports = {
    createGame,
    joinGame,
    getGameState,
};
