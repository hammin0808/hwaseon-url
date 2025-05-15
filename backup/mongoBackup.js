const mongoose = require('mongoose');
const Url = require('../models/url');

// MongoDB에 URL 데이터 백업
async function backupUrlToMongo(urlData) {
    try {
        const url = new Url({
            shortCode: urlData.shortCode,
            longUrl: urlData.longUrl,
            shortUrl: urlData.shortUrl,
            createdAt: urlData.createdAt,
            userId: urlData.userId,
            username: urlData.username,
            ip: urlData.ip,
            todayVisits: urlData.todayVisits || 0,
            totalVisits: urlData.totalVisits || 0,
            lastReset: urlData.lastReset || new Date(),
            logs: urlData.logs || []
        });

        // upsert 옵션을 사용하여 이미 존재하면 업데이트, 없으면 생성
        await Url.findOneAndUpdate(
            { shortCode: urlData.shortCode },
            url.toObject(),
            { upsert: true, new: true }
        );

        return true;
    } catch (error) {
        console.error('MongoDB 백업 중 오류:', error);
        return false;
    }
}

// URL 방문 통계 업데이트
async function updateUrlStats(shortCode, { todayVisits, totalVisits, newLog }) {
    try {
        const update = {
            $set: {
                todayVisits,
                totalVisits,
                lastReset: new Date()
            }
        };

        if (newLog) {
            update.$push = {
                logs: {
                    $each: [newLog],
                    $position: 0,
                    $slice: 100 // 최대 100개 로그만 유지
                }
            };
        }

        await Url.findOneAndUpdate(
            { shortCode },
            update,
            { new: true }
        );

        return true;
    } catch (error) {
        console.error('MongoDB 방문 통계 업데이트 중 오류:', error);
        return false;
    }
}

// MongoDB에서 URL 데이터 조회
async function getUrlFromMongo(shortCode) {
    try {
        return await Url.findOne({ shortCode });
    } catch (error) {
        console.error('MongoDB 데이터 조회 중 오류:', error);
        return null;
    }
}

// MongoDB에서 모든 URL 데이터 조회
async function getAllUrlsFromMongo() {
    try {
        return await Url.find({});
    } catch (error) {
        console.error('MongoDB 전체 데이터 조회 중 오류:', error);
        return [];
    }
}

// MongoDB에서 URL 삭제
async function deleteUrlFromMongo(shortCode) {
    try {
        await Url.deleteOne({ shortCode });
        return true;
    } catch (error) {
        console.error('MongoDB URL 삭제 중 오류:', error);
        return false;
    }
}

// MongoDB에서 모든 URL 삭제
async function deleteAllUrlsFromMongo() {
    try {
        await Url.deleteMany({});
        return true;
    } catch (error) {
        console.error('MongoDB 전체 URL 삭제 중 오류:', error);
        return false;
    }
}

module.exports = {
    backupUrlToMongo,
    getUrlFromMongo,
    getAllUrlsFromMongo,
    deleteUrlFromMongo,
    deleteAllUrlsFromMongo,
    updateUrlStats
}; 