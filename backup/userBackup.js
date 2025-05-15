const mongoose = require('mongoose');
const User = require('../models/user');

// MongoDB에 사용자 데이터 백업
async function backupUserToMongo(userData) {
    try {
        const user = new User({
            username: userData.username,
            passwordHash: userData.passwordHash,
            isAdmin: userData.isAdmin || false,
            createdAt: userData.createdAt || new Date()
        });

        // upsert 옵션을 사용하여 이미 존재하면 업데이트, 없으면 생성
        await User.findOneAndUpdate(
            { username: userData.username },
            user.toObject(),
            { upsert: true, new: true }
        );

        return true;
    } catch (error) {
        console.error('MongoDB 사용자 백업 중 오류:', error);
        return false;
    }
}

// MongoDB에서 모든 사용자 데이터 조회
async function getAllUsersFromMongo() {
    try {
        return await User.find({});
    } catch (error) {
        console.error('MongoDB 사용자 조회 중 오류:', error);
        return [];
    }
}

// MongoDB에서 사용자 삭제
async function deleteUserFromMongo(username) {
    try {
        await User.deleteOne({ username });
        return true;
    } catch (error) {
        console.error('MongoDB 사용자 삭제 중 오류:', error);
        return false;
    }
}

module.exports = {
    backupUserToMongo,
    getAllUsersFromMongo,
    deleteUserFromMongo
}; 