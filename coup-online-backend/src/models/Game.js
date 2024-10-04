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
    isAlive: { 
        type: Boolean, 
        default: true 
    },
    isConnected: { 
        type: Boolean, 
        default: true 
    },
});

const PendingActionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['income', 'foreignAid', 'coup', 'steal', 'taxes', 'assassinate'], 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    targetUserId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false
    },
    claimedRole: { 
        type: String, 
        enum: ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa', null], 
    },
}, { _id: false });

const GameSchema = new mongoose.Schema({
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
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    pendingAction: { // Handle ongoing actions
        type: PendingActionSchema,
        default: null
    },
}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);