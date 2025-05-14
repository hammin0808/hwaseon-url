const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            ssl: true,
            tls: true,
            tlsAllowInvalidCertificates: false,
            retryWrites: true,
            w: 'majority'
        });
        console.log('MongoDB Atlas에 연결되었습니다.');
    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB; 