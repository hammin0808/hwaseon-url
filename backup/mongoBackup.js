const mongoose = require('mongoose');
const Url = require('../models/url');

// MongoDB에 URL 백업
async function backupUrlToMongo(urlData) {
    try {
        // _id 필드 제거
        const safeUrlData = {
            shortCode: urlData.shortCode,
            longUrl: urlData.longUrl,
            shortUrl: urlData.shortUrl,
            createdAt: urlData.createdAt,
            userId: urlData.userId,
            username: urlData.username,
            ip: urlData.ip,
            todayVisits: urlData.todayVisits || 0,
            totalVisits: urlData.totalVisits || 0,
            logs: urlData.logs || []
        };

        // 기존 URL 찾기
        const existingUrl = await Url.findOne({ shortCode: urlData.shortCode });

        if (existingUrl) {
            // 기존 URL 업데이트
            await Url.updateOne(
                { shortCode: urlData.shortCode },
                { $set: safeUrlData }
            );
            console.log(`URL 업데이트 완료: ${urlData.shortCode}`);
        } else {
            // 새 URL 생성
            await Url.create(safeUrlData);
            console.log(`새 URL 생성 완료: ${urlData.shortCode}`);
        }
    } catch (error) {
        console.error('MongoDB URL 백업 중 오류:', error);
        throw error;
    }
}

// URL 통계 업데이트
async function updateUrlStats(shortCode, stats) {
    try {
        const { todayVisits, totalVisits, newLog } = stats;
        
        // 기존 URL 찾기
        const existingUrl = await Url.findOne({ shortCode });
        
        if (existingUrl) {
            // 통계 업데이트
            const updateData = {
                todayVisits,
                totalVisits
            };
            
            if (newLog) {
                updateData.$push = { logs: { $each: [newLog], $position: 0 } };
            }
            
            await Url.updateOne(
                { shortCode },
                { $set: updateData }
            );
            console.log(`URL 통계 업데이트 완료: ${shortCode}`);
        }
    } catch (error) {
        console.error('MongoDB URL 통계 업데이트 중 오류:', error);
        throw error;
    }
}

// MongoDB에서 모든 URL 가져오기
async function getAllUrlsFromMongo() {
    try {
        return await Url.find({}).lean();
    } catch (error) {
        console.error('MongoDB URL 조회 중 오류:', error);
        throw error;
    }
}

// MongoDB에서 URL 삭제
async function deleteUrlFromMongo(shortCode) {
    try {
        await Url.deleteOne({ shortCode });
        console.log(`URL 삭제 완료: ${shortCode}`);
    } catch (error) {
        console.error('MongoDB URL 삭제 중 오류:', error);
        throw error;
    }
}

// MongoDB에서 모든 URL 삭제
async function deleteAllUrlsFromMongo() {
    try {
        await Url.deleteMany({});
        console.log('모든 URL 삭제 완료');
    } catch (error) {
        console.error('MongoDB 모든 URL 삭제 중 오류:', error);
        throw error;
    }
}

module.exports = {
    backupUrlToMongo,
    getAllUrlsFromMongo,
    deleteUrlFromMongo,
    deleteAllUrlsFromMongo,
    updateUrlStats
}; 