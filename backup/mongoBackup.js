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

module.exports = {
    backupUrlToMongo,
    getUrlFromMongo,
    getAllUrlsFromMongo
}; 