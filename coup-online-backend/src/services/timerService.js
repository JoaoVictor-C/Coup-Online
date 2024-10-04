const { executePendingAction } = require('./gameService');

const gameTimers = {}; // Stores timers for each game

/**
 * Sets a timeout for a pending action in a game.
 * @param {String} gameId - The ID of the game.
 * @param {Function} callback - The function to execute when the timeout occurs.
 * @param {Number} delay - Timeout duration in milliseconds.
 */
const setActionTimeout = (gameId, callback, delay = 30000) => { // 30 seconds default
    // Clear any existing timer for the game
    clearActionTimeout(gameId);
    
    // Set a new timer
    gameTimers[gameId] = setTimeout(() => {
        callback();
        delete gameTimers[gameId];
    }, delay);
};

/**
 * Clears the timeout for a given game.
 * @param {String} gameId - The ID of the game.
 */
const clearActionTimeout = (gameId) => {
    if (gameTimers[gameId]) {
        clearTimeout(gameTimers[gameId]);
        delete gameTimers[gameId];
    }
};

module.exports = {
    setActionTimeout,
    clearActionTimeout,
};
