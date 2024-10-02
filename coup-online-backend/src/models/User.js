const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    coins: {
        type: Number,
        default: 2,
    },
    characters: [{
        type: String, // e.g., "Duke", "Assassin"
    }],
    influences: {
        type: Number,
        default: 2,
    },
    games: [{
        type: Schema.Types.ObjectId,
        ref: 'Game',
    }],
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);