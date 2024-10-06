const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Register a new user
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Get user profile
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;