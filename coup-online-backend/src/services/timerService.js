const actionTimeouts = {};

// Set a timeout for a specific game action
const setActionTimeout = (gameId, callback, delay) => {
    if (actionTimeouts[gameId]) {
        clearTimeout(actionTimeouts[gameId]);
    }
    actionTimeouts[gameId] = setTimeout(() => {
        delete actionTimeouts[gameId];
        callback();
    }, delay);
};

// Clear the timeout for a specific game action
const clearActionTimeout = (gameId) => {
    if (actionTimeouts[gameId]) {
        clearTimeout(actionTimeouts[gameId]);
        delete actionTimeouts[gameId];
    }
};

module.exports = { setActionTimeout, clearActionTimeout };