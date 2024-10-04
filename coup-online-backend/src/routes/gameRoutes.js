const express = require('express');
const router = express.Router();
const {
    createGame,
    joinGame,
    getGameState,
    handleDisconnection,
    startGame
} = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');
// Create a new game
router.post('/create', authMiddleware, createGame);
// Join a game
router.post('/join', authMiddleware, joinGame);
// Get game state
router.get('/:gameId', authMiddleware, getGameState);
// Start the game
router.post('/:gameId/start', authMiddleware, startGame);
// Handle disconnection (if needed as an API endpoint)
router.post('/disconnect/:gameId', authMiddleware, handleDisconnection);
// Export the router
module.exports = router;