const Game = require('../models/Game');
const PlayerProfile = require('../models/PlayerProfile');
const User = require('../models/User');

// Utility Functions
const shuffleArray = (array) => {
    return array.slice().sort(() => Math.random() - 0.5);
};

const removeRandomCharacter = (player) => {
    if (player.characters.length > 0) {
        const randomIndex = Math.floor(Math.random() * player.characters.length);
        player.characters.splice(randomIndex, 1);
        if (player.characters.length === 0) {
            player.isAlive = false;
        }
    }
    return player;
};

const checkGameOver = (game) => {
    const alivePlayers = game.players.filter(p => p.isAlive);
    if (alivePlayers.length === 1) {
        return alivePlayers[0].playerProfile.user._id;
    }
    return null;
};

const canActionBeBlocked = (actionType) => {
    const blockRules = {
        'foreignAid': ['Duke'],
        'steal': ['Captain', 'Ambassador'],
        'assassinate': ['Contessa']
    };
    return !!blockRules[actionType];
};

// Game Setup Functions
const initializeDeck = (playerCount) => {
    const roles = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
    const deck = [];
    const cardsPerRole = playerCount <= 4 ? 2 : 3;

    roles.forEach(role => {
        for (let i = 0; i < cardsPerRole; i++) {
            deck.push(role);
        }
    });

    return shuffleArray(deck);
};

const formatGameData = (game, userId) => {
    const formattedPlayers = game.players.map(player => {
        if (player.playerProfile.user._id.toString() !== userId) {
            return {
                ...player,
                characters: player.characters.map(() => 'hidden'),
            };
        }
        return player;
    });

    return { ...game, players: formattedPlayers };
};

// Game Management Functions
const addUserToGame = async (game, playerProfile) => {
    const user = await User.findById(playerProfile.user);
    if (!user) {
        return { success: false, status: 404, message: 'User not found' };
    }

    if (game.players.some(p => p.playerProfile.toString() === playerProfile._id.toString())) {
        return { success: true, status: 200, message: 'User reconnected to the game', game };
    }

    if (game.status !== 'waiting') {
        return { success: false, status: 400, message: 'Cannot join a game that has already started' };
    }

    if (game.players.length >= game.maxPlayers) {
        return { success: false, status: 400, message: 'Game is already full' };
    }

    const charactersPerPlayer = game.maxPlayers <= 4 ? 2 : 3;
    const characters = game.deck.splice(0, charactersPerPlayer);

    game.players.push({
        playerProfile: playerProfile._id,
        username: user.username,
        coins: 2,
        characters,
        isAlive: true,
        isConnected: true,
    });

    await game.save();
    await User.findByIdAndUpdate(user._id, { $push: { games: game._id } });

    const populatedGame = await Game.findById(game._id)
        .populate({
            path: 'players.playerProfile',
            select: 'user username',
            populate: {
                path: 'user',
                select: 'id username'
            }
        })
        .lean();

    const formattedGame = formatGameData(populatedGame, user._id);

    return { success: true, status: 200, message: 'User added to the game', game: formattedGame };
};

const startGameLogic = async (gameId, userId, io) => {
    const game = await Game.findById(gameId).populate({
        path: 'players.playerProfile',
        populate: { path: 'user' }
    });

    if (!game) {
        return { success: false, status: 404, message: 'Game not found' };
    }

    const isPlayer = game.players.some(player =>
        player.playerProfile &&
        player.playerProfile.user &&
        player.playerProfile.user._id.toString() === userId.toString()
    );

    if (!isPlayer) {
        return { success: false, status: 403, message: 'You are not a player in this game' };
    }

    if (game.status !== 'waiting') {
        return { success: false, status: 400, message: 'Game has already started' };
    }

    if (game.players.length < 2) {
        return { success: false, status: 400, message: 'At least 2 players are required to start the game' };
    }

    game.status = 'in_progress';
    game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
    game.currentPlayerUsername = game.players[game.currentPlayerIndex].username;
    await game.save();

    const updatedGame = await Game.findById(gameId).populate({
        path: 'players.playerProfile',
        populate: { path: 'user' }
    }).lean();

    const formattedGame = formatGameData(updatedGame, userId);

    io.to(gameId).emit('gameUpdate', formattedGame);

    return { success: true, status: 200, message: 'Game started successfully', game: formattedGame };
};

// Action Handlers
const handleIncome = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        game.centralTreasury -= 1;
        player.coins += 1;
        game = await Game.findByIdAndUpdate(game._id, game, { new: true });
        return { success: true, message: 'Income action successful' };
    }
    return { success: false, message: 'Action failed' };
};

const handleForeignAid = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 2) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 2;
        player.coins += 2;
        game = await Game.findByIdAndUpdate(game._id, game, { new: true });
        return { success: true, message: 'Foreign Aid action successful' };
    }
    return { success: false, message: 'Action failed' };
};

const handleCoup = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    if (player.coins < 7) {
        return { success: false, message: 'Not enough coins to perform coup' };
    }
    player.coins -= 7;
    game.centralTreasury += 7;
    removeRandomCharacter(targetPlayer);
    const winner = checkGameOver(game);
    if (winner) {
        game.status = 'finished';
        game.winner = winner;
    }
    game = await Game.findByIdAndUpdate(game._id, game, { new: true });
    return { success: true, message: 'Coup action successful' };
};

const handleTaxes = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 3) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 3;
        player.coins += 3;
        game = await Game.findByIdAndUpdate(game._id, game, { new: true });
        return { success: true, message: 'Taxes action successful' };
    }
    return { success: false, message: 'Action failed' };
};

const handleAssassinate = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    if (player.coins < 3) {
        return { success: false, message: 'Not enough coins to perform assassination' };
    }
    player.coins -= 3;
    game.centralTreasury -= 3;
    removeRandomCharacter(targetPlayer);
    const winner = checkGameOver(game);
    if (winner) {
        game.status = 'finished';
        game.winner = winner;
    }
    game = await Game.findByIdAndUpdate(game._id, game, { new: true });
    return { success: true, message: 'Assassinate action successful' };
};

const handleSteal = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    const stolenCoins = Math.min(2, targetPlayer.coins);
    targetPlayer.coins -= stolenCoins;
    player.coins += stolenCoins;
    const winner = checkGameOver(game);
    if (winner) {
        game.status = 'finished';
        game.winner = winner;
    }
    game = await Game.findByIdAndUpdate(game._id, game, { new: true });
    return { success: true, message: 'Steal action successful' };
};

const handleExchange = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        // Implement exchange logic as needed
        // Placeholder: Assume exchange is successful
        // You might want to allow the player to draw from the deck and replace characters
        game = await Game.findByIdAndUpdate(game._id, game, { new: true });
        return { success: true, message: 'Exchange action successful' };
    }
    return { success: false, message: 'Action failed' };
};

// Action Execution
const executeAction = async (game, action) => {
    const freshGame = await Game.findById(game._id)
        .populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        })
        .lean();

    switch (action.type) {
        case 'income':
            return await handleIncome(freshGame, action.userId);
        case 'foreignAid':
            return await handleForeignAid(freshGame, action.userId);
        case 'coup':
            return await handleCoup(freshGame, action.userId, action.targetUserId);
        case 'taxes':
            return await handleTaxes(freshGame, action.userId);
        case 'assassinate':
            return await handleAssassinate(freshGame, action.userId, action.targetUserId);
        case 'steal':
            return await handleSteal(freshGame, action.userId, action.targetUserId);
        case 'exchange':
            return await handleExchange(freshGame, action.userId);
        default:
            return { success: false, message: 'Unknown action type' };
    }
};

const executePendingAction = async (gameId, io) => {
    const game = await Game.findById(gameId)
        .populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        })
        .lean();
    if (!game || !game.pendingAction) return;

    const action = game.pendingAction;
    const result = await executeAction(game, action);
    game.pendingAction = null;
    advanceTurn(game);
    game = await Game.findByIdAndUpdate(game._id, game, { new: true });

    // Emit the updated game state
    const updatedGame = await Game.findById(gameId)
        .populate({
            path: 'players.playerProfile',
            populate: { path: 'user' }
        })
        .lean();
    io.to(gameId).emit('gameUpdate', updatedGame);
};

// Export functions
module.exports = {
    handleIncome,
    handleForeignAid,
    handleCoup,
    handleTaxes,
    handleAssassinate,
    handleSteal,
    handleExchange,
    initializeDeck,
    shuffleArray,
    checkGameOver,
    removeRandomCharacter,
    executeAction,
    executePendingAction,
    canActionBeBlocked,
    addUserToGame,
    startGameLogic,
    formatGameData
};