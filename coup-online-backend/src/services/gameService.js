const Game = require('../models/Game');
const PlayerProfile = require('../models/PlayerProfile');

// Handle Income Action
const handleIncome = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 1) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 1;
        player.coins += 1;
        
        // Update turn
        updateTurn(game);
        await game.save();
        return { success: true };
    }
    return { success: false, message: 'Action failed' };
};

// Handle Foreign Aid Action
const handleForeignAid = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        if (game.centralTreasury < 2) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 2;
        player.coins += 2;
        
        // Update turn
        updateTurn(game);
        await game.save();
        return { success: true };
    }
    return { success: false, message: 'Action failed' };
};

// Handle Coup Action
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
    targetPlayer.isAlive = false;
    
    // Update turn
    updateTurn(game);
        await game.save();
    return { success: true };
};

// Handle Taxes Action (Requires Duke)
const handleTaxes = async (game, userId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    if (player && player.isAlive) {
        // Verify if the player has Duke influence
        const duke = player.characters.includes('Duke');
        if (game.centralTreasury < 3) {
            return { success: false, message: 'Not enough funds in the treasury' };
        }
        game.centralTreasury -= 3;
        player.coins += 3;
        
        // Update turn
        updateTurn(game);
        await game.save();
        return { success: true };
    } else {
        return { success: false, message: 'Action denied: You do not have the Duke influence' };
    }
};

// Handle Assassinate Action (Requires Assassin)
const handleAssassinate = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());

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
    if (targetPlayer.characters.length > 0) {
        const randomIndex = Math.floor(Math.random() * targetPlayer.characters.length);
        targetPlayer.characters.splice(randomIndex, 1);
        // Update influences
        if (targetPlayer.characters.length === 0) {
            targetPlayer.isAlive = false;
        }
    } else {
        // No characters left, eliminate the player
        targetPlayer.isAlive = false;
    }

    // Update turn
    updateTurn(game);
    await game.save();
    return { success: true };
};

// Initialize Deck based on player count
const initializeDeck = (playerCount) => {
    const roles = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
    let deck = [];
    roles.forEach(role => {
        for (let i = 0; i < 3; i++) {
            deck.push(role);
        }
    });

    // Adjust deck size based on player count
    let cardsPerPlayer;
    if (playerCount >= 2 && playerCount <= 4) {
        cardsPerPlayer = 2;
    } else if (playerCount > 4 && playerCount <= 6) {
        cardsPerPlayer = 3;
    } else if (playerCount >= 8) {
        cardsPerPlayer = 4;
    } else {
        // Default to 2 if player count doesn't match any category
        cardsPerPlayer = 2;
    }

    return shuffleArray(deck);
};

// Handle Steal Action (Captain)
const handleSteal = async (game, userId, targetUserId) => {
    const player = game.players.find(p => p.playerProfile.user._id.toString() === userId.toString());
    const targetPlayer = game.players.find(p => p.playerProfile.user._id.toString() === targetUserId.toString());

    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
        return { success: false, message: 'Invalid players' };
    }

    if (player.coins < 0) { // Assuming stealing doesn't require coins
        return { success: false, message: 'Action failed' };
    }

    const stolenCoins = Math.min(2, targetPlayer.coins);
    targetPlayer.coins -= stolenCoins;
    player.coins += stolenCoins;

    // Update turn
    updateTurn(game);
    await game.save();
    return { success: true };
};

// Handle Steal Action Block
const blockSteal = async (game, userId, actingUserId) => {
    // Logic to block steal action
    // This could involve setting a block flag or similar
    // Implementation depends on how challenges and blocks are managed
    // Placeholder implementation
    return { success: true };
};

// Shuffle Array (unchanged)
const shuffleArray = (array) => {
    return array.slice().sort(() => Math.random() - 0.5);
};

const getNextPlayerIndex = (game) => {
    const totalPlayers = game.players.length;

    let nextIndex = (game.currentPlayerIndex + 1) % totalPlayers;
    
    // Find the next alive and connected player
    while (!game.players[nextIndex].isAlive || !game.players[nextIndex].isConnected) {
        nextIndex = (nextIndex + 1) % totalPlayers;
    }
    
    return nextIndex;
};

const updateTurn = (game) => {
    const nextIndex = getNextPlayerIndex(game);
    
    game.currentPlayerIndex = nextIndex;
    game.currentPlayerUsername = game.players[nextIndex].username;
    
    return game;
};

const checkGameOver = (game) => {
    const alivePlayers = game.players.filter(p => p.isAlive);
    if (alivePlayers.length === 1) {
        game.status = 'finished';
        // Optionally, set the winner
        game.winner = alivePlayers[0].playerProfile.user._id;
        return alivePlayers[0].playerProfile.user.username;
    }
    return null;
};

// Export functions
module.exports = {
    handleIncome,
    handleForeignAid,
    handleCoup,
    handleTaxes,
    handleAssassinate,
    handleSteal, // Added handleSteal
    blockSteal, // Added blockSteal
    initializeDeck,
    shuffleArray,
    getNextPlayerIndex,
    updateTurn,
    checkGameOver,
    // Add other action handlers as needed
};