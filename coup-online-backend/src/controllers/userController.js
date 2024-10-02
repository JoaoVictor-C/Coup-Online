const User = require('../models/User');

/**
 * Get user details
 */
const getUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-password').populate('games');

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
    getUser,
    // Add more user-related functions as needed
};
