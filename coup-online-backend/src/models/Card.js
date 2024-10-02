const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CardSchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'],
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);