const mongoose = require('mongoose');
const User = require('../models/user');

// MongoDB에 사용자 백업
async function backupUserToMongo(user) {
  try {
    // 필수 필드 확인
    if (!user.id) {
      user.id = Date.now().toString();
    }

    // MongoDB의 immutable 필드 보호를 위해 _id 무조건 제거
    const safeUser = {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      email: user.email || null,
      isAdmin: user.isAdmin || false,
      createdAt: user.createdAt || new Date()
    };

    const existingUser = await User.findOne({ 
      $or: [
        { username: user.username },
        { id: user.id }
      ]
    });

    if (existingUser) {
      await User.updateOne(
        { id: existingUser.id },
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
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`사용자를 찾을 수 없음: ${username}`);
      return;
    }
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
