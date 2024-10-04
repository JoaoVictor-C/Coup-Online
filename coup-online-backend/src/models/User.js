const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        playerProfile: {
            type: Schema.Types.ObjectId,
            ref: 'PlayerProfile',
        },
        // Add games the user is part of, if not already present
        games: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Game',
            },
        ],
        
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);