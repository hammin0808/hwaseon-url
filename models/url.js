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
    todayVisits: {
        type: Number,
        default: 0
    },
    totalVisits: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastReset: {
        type: Date,
        default: Date.now
    },
    ip: String,
    userId: String,
    username: String,
    memo: String,
    logs: [{
        ip: String,
        time: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('Url', urlSchema); 