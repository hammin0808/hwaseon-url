const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    shortCode: {
        type: String,
        required: true,
        unique: true
    },
    longUrl: {
        type: String,
        required: true
    },
    shortUrl: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: String,
        default: null
    },
    username: {
        type: String,
        default: null
    },
    ip: {
        type: String
    },
    todayVisits: {
        type: Number,
        default: 0
    },
    totalVisits: {
        type: Number,
        default: 0
    },
    lastReset: {
        type: Date,
        default: Date.now
    },
    logs: [{
        ip: String,
        time: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('Url', urlSchema); 