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
        console.log('MongoDB 사용자 삭제 시도:', userId);
        
        // ObjectId 변환 시도
        let objectId = null;
        try {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                objectId = new mongoose.Types.ObjectId(userId);
            }
        } catch (err) {
            console.log('ObjectId 변환 실패:', err.message);
        }

        // 검색 조건 구성
        const searchQuery = {
            $or: [
                { _id: objectId },
                { id: userId },
                { username: userId }
            ]
        };
        console.log('검색 조건:', JSON.stringify(searchQuery, null, 2));

        // 사용자 찾기
        const user = await User.findOne(searchQuery);
        console.log('찾은 사용자:', user ? {
            _id: user._id,
            id: user.id,
            username: user.username
        } : '없음');

        if (!user) {
            console.log('MongoDB에서 사용자를 찾을 수 없음:', userId);
            // 직접 삭제 시도
            const deleteResult = await User.deleteMany({
                $or: [
                    { _id: objectId },
                    { id: userId },
                    { username: userId }
                ]
            });
            console.log('직접 삭제 결과:', deleteResult);
            return true;
        }

        // 사용자 삭제
        const result = await User.deleteOne({ _id: user._id });
        console.log('MongoDB 삭제 결과:', result);
        
        if (result.deletedCount === 0) {
            // 삭제된 문서가 없으면 다시 시도
            const retryResult = await User.deleteOne({ username: user.username });
            console.log('재시도 삭제 결과:', retryResult);
        }

        return true;
    } catch (error) {
        console.error('MongoDB 사용자 삭제 중 오류:', error);
        // 에러 발생시에도 계속 진행
        return true;
    }
}

module.exports = {
  backupUserToMongo,
  getAllUsersFromMongo,
  deleteUserFromMongo
};
