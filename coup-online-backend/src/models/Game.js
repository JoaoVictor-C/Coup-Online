const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameSchema = new Schema({
    players: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        isTurn: {
            type: Boolean,
            default: false,
        },
        isAlive: {
            type: Boolean,
            default: true,
        },
    }],
    deck: [{
        type: String, // e.g., "Duke", "Assassin"
    }],
    discardPile: [{
        type: String,
    }],
    centralTreasury: {
        type: Number,
        default: 50, // Starting amount
    },
    status: {
        type: String,
        enum: ['waiting', 'in_progress', 'finished'],
        default: 'waiting',
    },
    currentPlayerIndex: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);