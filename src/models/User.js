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
            index: true // Indexed for faster queries
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false // Do not return password by default
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true // Indexed for faster queries
        },
        playerProfile: {
            type: Schema.Types.ObjectId,
            ref: 'PlayerProfile',
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

module.exports = mongoose.model('User', UserSchema);