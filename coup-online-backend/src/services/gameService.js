const Game = require('../models/Game');
const PlayerProfile = require('../models/PlayerProfile');
// Handle Income Action
const handleIncome = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user.id.toString() === userId.toString());
    if (player && player.isAlive) {
        game.centralTreasury -= 1;
        player.coins += 1;
        await game.save();
        return { success: true, message: 'Income action successful' };
    }
    return { success: false, message: 'Action failed' };
};
// Handle Foreign Aid Action
const handleForeignAid = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user.id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 2) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 2;
        player.coins += 2;
        await game.save();
        return { success: true, message: 'Foreign Aid action successful' };
    }
    return { success: false, message: 'Action failed' };
};
// Handle Coup Action
const handleCoup = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user.id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user.id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    if (player.coins < 7) {
        return { success: false, message: 'Not enough coins to perform coup' };
    }
    player.coins -= 7;
    removeRandomCharacter(targetPlayer);
    const winner = checkGameOver(game);
    if (winner) {
        game.status = 'finished';
        game.winner = winner;
    }
    await game.save();
    return { success: true, message: 'Coup action successful' };
};
// Handle Taxes Action (Requires Duke)
const handleTaxes = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user.id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 3) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 3;
        player.coins += 3;
        await game.save();
        return { success: true, message: 'Taxes action successful' };
    }
    return { success: false, message: 'Action failed' };
};

// Handle Assassinate Action (Requires Assassin)
const handleAssassinate = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user.id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user.id.toString() === targetUserId.toString());
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }
    if (player.coins < 3) {
        return { success: false, message: 'Not enough coins to perform assassination' };
    }
    // Spend coins
    player.coins -= 3;
    game.centralTreasury -= 3;
    // Remove a random character from the target player
    removeRandomCharacter(targetPlayer);
    const winner = checkGameOver(game);
    if (winner) {
        game.status = 'finished';
        game.winner = winner;
    }
    await game.save();
    return { success: true, message: 'Assassinate action successful' };
};
// Handle Steal Action (Captain)
const handleSteal = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user.id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user.id.toString() === targetUserId.toString());
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
    await game.save();
    return { success: true, message: 'Steal action successful' };
};
// Handle Exchange Action (Ambassador)
const handleExchange = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user.id.toString() === userId.toString());
    if (player && player.isAlive) {
        // Implement exchange logic as needed
        // Placeholder: Assume exchange is successful
        // You might want to allow the player to draw from the deck and replace characters
        await game.save();
        return { success: true, message: 'Exchange action successful' };
    }
    return { success: false, message: 'Action failed' };
};
// Initialize Deck based on player count
const initializeDeck = (playerCount) => {
    const roles = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
    let deck = [];
    // Adjust deck size based on player count
    const cardsPerRole = {
        'Duke': 3,
        'Assassin': 3,
        'Captain': 3,
        'Ambassador': 3,
        'Contessa': 3
    };
    for (const role in cardsPerRole) {
        for (let i = 0; i < cardsPerRole[role]; i++) {
            deck.push(role);
        }
    }
    return shuffleArray(deck);
};
// Shuffle Array (unchanged)
const shuffleArray = (array) => {
    return array.slice().sort(() => Math.random() - 0.5);
};

// Check if game is over
const checkGameOver = (game) => {
    const alivePlayers = game.players.filter(p => p.isAlive);
    if (alivePlayers.length === 1) {
        return alivePlayers[0].playerProfile.user.id;
    }
    return null;
};
// Helper function to remove a random character
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

const canActionBeBlocked = (actionType) => {
    const blockRules = {
        'foreignAid': ['Duke'],
        'steal': ['Captain', 'Ambassador'],
        'assassinate': ['Contessa']
    };
    return !!blockRules[actionType]; // Return true if the action can be blocked, false otherwise
};

const executeAction = async (game, action) => {
    switch (action.type) {
        case 'income':
            return await handleIncome(game, action.userId);
        case 'foreignAid':
            return await handleForeignAid(game, action.userId);
        case 'coup':
            return await handleCoup(game, action.userId, action.targetUserId);
        case 'taxes':
            return await handleTaxes(game, action.userId);
        case 'assassinate':
            return await handleAssassinate(game, action.userId, action.targetUserId);
        case 'steal':
            return await handleSteal(game, action.userId, action.targetUserId);
        case 'exchange':
            return await handleExchange(game, action.userId);
        default:
            return { success: false, message: 'Unknown action type' };
    }
};

const executePendingAction = async (gameId, io) => {
    const game = await Game.findById(gameId).populate({
        path: 'players.playerProfile',
        populate: { path: 'user' }
    });
    if (!game || !game.pendingAction) return;

    const action = game.pendingAction;
    const result = await executeAction(game, action);
    game.pendingAction = null;
    advanceTurn(game);
    await game.save();

    // Emit the updated game state
    const updatedGame = await Game.findById(gameId).populate({
        path: 'players.playerProfile',
        populate: { path: 'user' }
    });
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
};