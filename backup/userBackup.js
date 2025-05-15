const mongoose = require('mongoose');

// User 스키마 정의
const userSchema = new mongoose.Schema({
  id: String,
  username: { type: String, unique: true },
  passwordHash: String,
  isAdmin: Boolean,
  createdAt: Date
});

const User = mongoose.model('User', userSchema);

// MongoDB에 사용자 백업
async function backupUserToMongo(user) {
  try {
    // 기존 사용자 찾기
    const existingUser = await User.findOne({ username: user.username });
    
    if (existingUser) {
      // 기존 사용자 업데이트
      await User.updateOne(
        { username: user.username },
        {
          $set: {
            id: user.id,
            passwordHash: user.passwordHash,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt
          }
        }
      );
      console.log(`사용자 업데이트 완료: ${user.username}`);
    } else {
      // 새 사용자 생성
      const newUser = new User({
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      });
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