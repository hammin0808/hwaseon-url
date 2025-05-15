const mongoose = require('mongoose');
const User = require('../models/user');

// MongoDB에 사용자 백업
async function backupUserToMongo(user) {
  try {
    // MongoDB의 immutable 필드 보호를 위해 _id 무조건 제거
    const safeUser = {
      username: user.username,
      passwordHash: user.passwordHash,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    };

    const existingUser = await User.findOne({ username: user.username });

    if (existingUser) {
      await User.updateOne(
        { username: user.username },
        { $set: safeUser }
      );
      console.log(`기존 사용자 업데이트 완료: ${user.username}`);
    } else {
      const newUser = new User(safeUser);
      await newUser.save();
      console.log(`새 사용자 생성 완료: ${user.username}`);
    }
  } catch (error) {
    console.error('MongoDB 사용자 백업 중 오류:', error);
    throw error;
  }
}


// MongoDB에서 모든 사용자 가져오기
async function getAllUsersFromMongo() {
  try {
    const users = await User.find({}).lean();
    return users;
  } catch (error) {
    console.error('MongoDB에서 사용자 조회 중 오류:', error);
    throw error;
  }
}

// MongoDB에서 사용자 삭제
async function deleteUserFromMongo(username) {
  try {
    await User.deleteOne({ username });
    console.log(`사용자 삭제 완료: ${username}`);
  } catch (error) {
    console.error('MongoDB에서 사용자 삭제 중 오류:', error);
    throw error;
  }
}

module.exports = {
  backupUserToMongo,
  getAllUsersFromMongo,
  deleteUserFromMongo
};
