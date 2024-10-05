const express = require('express');
const router = express.Router();
const {
    createGame,
    getGameState,
    handleDisconnection,
} = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');
// Create a new game
router.post('/create', authMiddleware, createGame);
// Join a game
router.get('/:gameId', authMiddleware, getGameState);
// Handle disconnection (if needed as an API endpoint)
router.post('/disconnect/:gameId', authMiddleware, handleDisconnection);
// Export the router
module.exports = router;