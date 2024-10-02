const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new game
router.post('/create', authMiddleware, gameController.createGame);

// Join an existing game
router.post('/join', authMiddleware, gameController.joinGame);

// Get game state
router.get('/:gameId', authMiddleware, gameController.getGameState);

module.exports = router;