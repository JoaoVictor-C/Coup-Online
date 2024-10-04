const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlayerProfileSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        username: {
            type: String,
            required: true,
        },
        coins: {
            type: Number,
            default: 2,
            min: 0,
        },
        characters: [
            {
                type: String,
                enum: ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa', 'hidden'],
                default: 'hidden',
            },
        ],
        influences: {
            type: Number,
            default: 2,
            min: 0,
        },
        isConnected: { // Track connection status
            type: Boolean,
            default: true,
        },
        games: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Game',
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('PlayerProfile', PlayerProfileSchema);