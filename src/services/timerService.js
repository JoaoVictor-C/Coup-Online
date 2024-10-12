const actionTimers = new Map();

// Set Action Timeout
const setActionTimeout = (gameId, timeoutDuration, callback) => {
    if (actionTimers.has(gameId)) {
        clearTimeout(actionTimers.get(gameId));
    }
    const timer = setTimeout(() => {
        callback();
        actionTimers.delete(gameId);
    }, timeoutDuration);
    actionTimers.set(gameId, timer);
};

// Clear Action Timeout
const clearActionTimeout = (gameId) => {
    if (actionTimers.has(gameId)) {
        clearTimeout(actionTimers.get(gameId));
        actionTimers.delete(gameId);
    }
};

module.exports = {
    setActionTimeout,
    clearActionTimeout,
};