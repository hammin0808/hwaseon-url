const mongoose = require('mongoose');

// User 스키마 정의
const userSchema = new mongoose.Schema({
  id: String,
  username: String,
  passwordHash: String,
  isAdmin: Boolean,
  createdAt: Date
});

const User = mongoose.model('User', userSchema);

// MongoDB에 사용자 백업
async function backupUserToMongo(user) {
  try {
    // ID가 없는 경우 생성
    if (!user.id) {
      user.id = Date.now().toString();
    }

    // createdAt이 없는 경우 현재 시간으로 설정
    if (!user.createdAt) {
      user.createdAt = new Date().toISOString();
    }

    // 업데이트할 데이터 준비
    const userData = {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    };

    // findOneAndUpdate 대신 updateOne 사용
    const result = await User.updateOne(
      { username: user.username },
      userData,
      { upsert: true } // 문서가 없으면 생성
    );

    if (result.upsertedCount > 0) {
      console.log(`새 사용자 생성 완료: ${user.username}`);
    } else if (result.modifiedCount > 0) {
      console.log(`사용자 업데이트 완료: ${user.username}`);
    } else {
      console.log(`사용자 데이터 변경 없음: ${user.username}`);
    }
  } catch (error) {
    console.error('MongoDB 사용자 백업 중 오류:', error);
    throw error;
  }
}

// MongoDB에서 모든 사용자 가져오기
async function getAllUsersFromMongo() {
  try {
    const users = await User.find({});
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