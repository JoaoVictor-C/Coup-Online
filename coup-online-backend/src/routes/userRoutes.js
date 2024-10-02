const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Get user details
router.get('/:userId', authMiddleware, userController.getUser);

// Add more user-related routes as needed

module.exports = router;
