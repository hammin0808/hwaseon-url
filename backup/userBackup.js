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
async function deleteUserFromMongo(userId) {
    try {
        // _id, id, username 중 하나로 사용자 찾기
        const user = await User.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null },
                { id: userId },
                { username: userId }
            ]
        });

        if (!user) {
            console.log('MongoDB에서 사용자를 찾을 수 없음:', userId);
            // 사용자를 찾지 못해도 에러를 던지지 않고 성공으로 처리
            return true;
        }

        // 사용자 삭제
        await User.deleteOne({ _id: user._id });
        console.log('MongoDB에서 사용자 삭제 완료:', user.username, user._id);
        return true;
    } catch (error) {
        console.error('MongoDB 사용자 삭제 중 오류:', error);
        // 에러가 발생해도 로컬 DB 삭제는 진행되도록 true 반환
        return true;
    }
}

module.exports = {
  backupUserToMongo,
  getAllUsersFromMongo,
  deleteUserFromMongo
};
