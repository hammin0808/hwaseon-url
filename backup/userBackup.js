const mongoose = require('mongoose');
const User = require('../models/user');

// MongoDB에 사용자 백업
async function backupUserToMongo(user) {
  try {
    // _id 필드 제거해서 불변 필드 업데이트 방지
    const { _id, ...safeUser } = user;

    // 기존 사용자 찾기
    const existingUser = await User.findOne({ username: safeUser.username });

    if (existingUser) {
      await User.updateOne(
        { username: safeUser.username },
        { $set: safeUser }
      );
      console.log(`기존 사용자 업데이트 완료: ${safeUser.username}`);
    } else {
      const newUser = new User(safeUser);
      await newUser.save();
      console.log(`새 사용자 생성 완료: ${safeUser.username}`);
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
