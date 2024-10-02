const Game = require('../models/Game');
const User = require('../models/User');

// Example function to handle the Income action
const handleIncome = async (gameId, userId) => {
    const game = await Game.findById(gameId);
    const player = game.players.find(p => p.user.toString() === userId);
    if (player && player.isAlive) {
        game.centralTreasury -= 1;
        const user = await User.findById(userId);
        user.coins += 1;
        await user.save();
        await game.save();
        return { success: true };
    }
    return { success: false, message: 'Action failed' };
};

// Export functions
module.exports = {
    handleIncome,
    // Add other action handlers
};