const mongoose = require('mongoose');
const PlayerSchema = new mongoose.Schema({
    playerProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlayerProfile',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    coins: {
        type: Number,
        default: 2
    },
    characters: {
        type: [String],
        default: []
    },
    deadCharacters: {
        type: [String],
        default: []
    },
    isAlive: {
        type: Boolean,
        default: true
    },
    isConnected: {
        type: Boolean,
        default: true
    },
});
    // Start of Selection
    const PendingActionSchema = new mongoose.Schema({
        type: {
            type: String,
            enum: ['income', 'foreignAid', 'coup', 'steal', 'taxes', 'assassinate', 'exchange', 'challengeSuccess', 'challengeSuccessSelection'], // Added 'challengeSuccessSelection'
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        challengerId: { // Added to track who initiated the challenge
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        targetUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        claimedRole: {
            type: String,
            enum: ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa', null],
            default: null
        },
        blockers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        }],
        canBeBlocked: {
            type: Boolean,
            default: false
        },
        canBeChallenged: {
            type: Boolean,
            default: false
        },
        challenged: {
            type: Boolean,
            default: false
        },
        blockPending: {
            type: Boolean,
            default: false
        },
        exchange: {
            combinedCards: {
                type: [String],
                default: []
            }
        },
        accepted: {
            type: Boolean,
            default: false
        },
        // New fields for tracking accepts
        acceptedPlayers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: []
        }],
        // New field for challenge success selection
        challengeExtraCards: {
            type: [String],
            default: []
        },
        selectedChallengeCard: {
            type: String,
            default: null
        },
        originalAction: {
            type: String,
            default: null
        }
    }, { id: false });
const GameSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true,
        default: () => Math.floor(Math.random() * 1000000), // interval 0-999999
    },
    players: {
        type: [PlayerSchema],
        default: []
    },
    deck: {
        type: [String],
        default: []
    },
    centralTreasury: {
        type: Number,
        default: 1000
    },
    status: {
        type: String,
        enum: ['waiting', 'in_progress', 'finished'],
        default: 'waiting'
    },
    maxPlayers: {
        type: Number,
        default: 6
    },
    currentPlayerIndex: {
        type: Number,
        default: 0
    },
    currentPlayerUsername: {
        type: String,
        default: ''
    },
    winner: {
        type: String,
        default: null
    },
    pendingAction: { // Handle ongoing actions
        type: PendingActionSchema,
        default: null
    },
}, { timestamps: true });
module.exports = mongoose.model('Game', GameSchema);