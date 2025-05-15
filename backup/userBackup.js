const mongoose = require('mongoose');
const User = require('../models/user');

// MongoDB에 사용자 백업
async function backupUserToMongo(userData) {
    try {
        const user = new User(userData);
        await user.save();
        return true;
    } catch (error) {
        console.error('MongoDB 사용자 백업 중 오류:', error);
        throw error;
    }
}

// MongoDB에서 모든 사용자 가져오기
async function getAllUsersFromMongo() {
    try {
        return await User.find({});
    } catch (error) {
        console.error('MongoDB 사용자 조회 중 오류:', error);
        throw error;
    }
}

// MongoDB에서 사용자 삭제
async function deleteUserFromMongo(userId) {
    try {
        // id 또는 username으로 사용자 찾기
        const user = await User.findOne({
            $or: [
                { id: userId },
                { username: userId }
            ]
        });

        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        // 사용자 삭제
        await User.deleteOne({ _id: user._id });
        console.log('MongoDB에서 사용자 삭제 완료:', user.username);
        return true;
    } catch (error) {
        console.error('MongoDB 사용자 삭제 중 오류:', error);
        throw error;
    }
}

module.exports = {
    backupUserToMongo,
    getAllUsersFromMongo,
    deleteUserFromMongo
};
