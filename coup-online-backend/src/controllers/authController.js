const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');

/**
 * Register a new user
 */
const register = async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Validate input
        if (!username || !password || !email) {
            return res.status(400).json({ message: 'Username, password, and email are required' });
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds for better security
        user = new User({
            username,
            password: hashedPassword,
            email,
            games: [], // Initialize games as an empty array if not already handled by the schema
        });

        await user.save(); // Save the user before creating PlayerProfile to get the user._id

        // Create player profile
        const playerProfile = new PlayerProfile({
            user: user._id,
            username: username, // Assign the username to PlayerProfile
            // Initialize other fields if necessary
        });

        await playerProfile.save();

        // Link player profile to user
        user.playerProfile = playerProfile._id;
        await user.save();

        // Generate JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '24h', // Extended token validity
        });

        res.status(200).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                playerProfile: {
                    id: playerProfile._id,
                    coins: playerProfile.coins,
                    influences: playerProfile.influences,
                },
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Login a user
 */
const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists and populate playerProfile
        const user = await User.findOne({ username }).populate('playerProfile');
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                playerProfile: {
                    id: user.playerProfile._id,
                    coins: user.playerProfile.coins,
                    influences: user.playerProfile.influences,
                    // Add other PlayerProfile fields if needed
                },
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate({
                path: 'playerProfile',
                populate: { path: 'games' }
            });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            user,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
};