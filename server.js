const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = 5001;
const DB_FILE = './db.json';
const LAST_CRAWLED_FILE = './last_crawled.json';

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// OPTIONS 요청에 대한 처리
app.options('*', cors());

app.use(express.json());

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'url.html'));
});

// 다중 URL 단축 페이지
app.get('/multiple', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'multiple.html'));
});

// 다중 URL 단축 페이지 (HTML 파일 직접 접근)
app.get('/multiple.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'multiple.html'));
});

// 대시보드 페이지
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 대시보드 페이지 (기존 경로도 유지)
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// DB 저장
function saveDB(data) {
    const tempFile = DB_FILE + '.tmp';
    const backupFile = DB_FILE + '.bak';
    
    try {
        // 1. 현재 DB 백업
        if (fs.existsSync(DB_FILE)) {
            fs.copyFileSync(DB_FILE, backupFile);
        }
        
        // 2. 임시 파일에 새 데이터 저장
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(tempFile, jsonData);
        
        // 3. 임시 파일이 유효한지 확인
        const tempData = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
        if (typeof tempData !== 'object') {
            throw new Error('Invalid data format');
        }
        
        // 4. 실제 파일로 이동
        fs.renameSync(tempFile, DB_FILE);
        console.log('DB saved successfully');
        
        // 5. 백업 파일 삭제
        if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
        }
    } catch (error) {
        console.error('Error saving DB:', error);
        
        // 오류 발생 시 복구
        try {
            // 임시 파일이 있으면 삭제
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            
            // 백업 파일이 있으면 복원
            if (fs.existsSync(backupFile)) {
                fs.renameSync(backupFile, DB_FILE);
                console.log('DB restored from backup');
            }
        } catch (recoveryError) {
            console.error('Error during recovery:', recoveryError);
        }
        
        throw error;
    }
}

// DB 로드
function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (error) {
        console.error('Error loading DB:', error);
        return {};
    }
}

// 랜덤 코드 생성 (6자리 영숫자)
function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 오늘 자정 시간 구하기
function getTodayMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
}

// 단축 URL 생성 시 도메인 설정
const BASE_URL = 'https://hwaseon-url.onrender.com';

// URL 단축 API
app.post('/shorten', (req, res) => {
    const longUrl = req.body.url;
    if (!longUrl) {
        return res.status(400).json({ error: 'URL 누락' });
    }
    let shortCode;
    const db = loadDB();
    do {
        shortCode = generateShortCode();
    } while (db[shortCode]);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    db[shortCode] = {
        longUrl: longUrl,
        shortUrl: `${BASE_URL}/${shortCode}`,
        todayVisits: 0,
        totalVisits: 0,
        createdAt: new Date().toISOString(),
        lastReset: new Date().toISOString(),
        ip: ip,
        logs: []
    };
    saveDB(db);
    res.json({ 
        shortUrl: db[shortCode].shortUrl,
        shortCode: shortCode
    });
});

// 여러 URL 단축 API
app.post('/shorten-multiple', (req, res) => {
    const urls = req.body.urls;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'URL 목록이 필요합니다' });
    }

    const results = [];
    const db = loadDB();
    // 클라이언트 IP 추출 (로컬서버 포함)
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';

    for (const longUrl of urls) {
        if (!longUrl) continue;

        // 중복되지 않는 코드 생성
        let shortCode;
        do {
            shortCode = generateShortCode();
        } while (db[shortCode]);

        // URL 저장
        db[shortCode] = {
            longUrl: longUrl,
            shortUrl: `${BASE_URL}/${shortCode}`,
            todayVisits: 0,
            totalVisits: 0,
            createdAt: new Date().toISOString(),
            lastReset: new Date().toISOString(),
            ip: ip
        };

        results.push({
            originalUrl: longUrl,
            shortUrl: db[shortCode].shortUrl,
            shortCode: shortCode
        });
    }

    // DB 저장
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    console.log('Created multiple URLs:', results);

    res.json({ 
        success: true,
        urls: results
    });
});

// URL 목록 조회 API
app.get('/urls', (req, res) => {
    try {
        const db = loadDB();
        if (!db || typeof db !== 'object') {
            return res.json([]);
        }
        const urls = Object.entries(db).map(([shortCode, data]) => ({
            shortCode,
            longUrl: data.longUrl || '',
            shortUrl: data.shortUrl || `${BASE_URL}/${shortCode}`,
            todayVisits: data.todayVisits || 0,
            totalVisits: data.totalVisits || 0,
            createdAt: data.createdAt || new Date().toISOString(),
            ip: data.ip || 'unknown',
            logsCount: (data.logs && data.logs.length) || 0
        }));
        urls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(urls);
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// URL 삭제 API
app.delete('/urls/:shortCode', (req, res) => {
  try {
    const { shortCode } = req.params;
    const db = loadDB();
    
    if (!db[shortCode]) {
      return res.status(404).json({ error: 'URL을 찾을 수 없습니다' });
    }
    
    delete db[shortCode];
    saveDB(db);
    res.json({ message: 'URL이 삭제되었습니다' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// URL 수정 API
app.put('/urls/:shortCode', (req, res) => {
  try {
    const { shortCode } = req.params;
    const { memo } = req.body;
    const db = loadDB();
    
    if (!db[shortCode]) {
      return res.status(404).json({ error: 'URL을 찾을 수 없습니다' });
    }
    
    db[shortCode].memo = memo;
    saveDB(db);
    res.json({ message: 'URL이 수정되었습니다' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 단축 URL 리다이렉트
app.get('/:shortCode', (req, res, next) => {
    const { shortCode } = req.params;
    
    // 특정 경로는 무시하고 다음 미들웨어로 전달
    if (shortCode === 'dashboard' || 
        shortCode === 'multiple' || 
        shortCode.includes('.')) {
        return next();
    }

    // DB 로드
    const db = loadDB();
    
    // 단축 URL이 존재하는지 확인
    if (!db[shortCode]) {
        return res.status(404).send('유효하지 않은 단축 URL입니다.');
    }

    // 방문수 증가
    db[shortCode].todayVisits = (db[shortCode].todayVisits || 0) + 1;
    db[shortCode].totalVisits = (db[shortCode].totalVisits || 0) + 1;
    
    // logs 기록
    if (!db[shortCode].logs) db[shortCode].logs = [];
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    db[shortCode].logs.unshift({ ip, time: new Date().toISOString() });
    if (db[shortCode].logs.length > 100) db[shortCode].logs = db[shortCode].logs.slice(0, 100);
    
    // DB 저장
    saveDB(db);
    
    // 리다이렉트
    const targetUrl = db[shortCode].longUrl.startsWith('http') 
        ? db[shortCode].longUrl 
        : 'https://' + db[shortCode].longUrl;
    
    console.log('Visit increased for', shortCode, ':', {
        today: db[shortCode].todayVisits,
        total: db[shortCode].totalVisits
    });
    
    // 캐시 제어 헤더 추가
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    
    return res.redirect(302, targetUrl);
});

// URL 상세 정보 조회 API
app.get('/urls/:shortCode/details', (req, res) => {
    try {
        const { shortCode } = req.params;
        const db = loadDB();
        
        if (!db[shortCode]) {
            return res.status(404).json({ error: 'URL을 찾을 수 없습니다' });
        }
        
        // 상세 정보 반환
        const urlData = db[shortCode];
        res.json({
            shortCode,
            createdAt: urlData.createdAt,
            ip: urlData.ip,
            todayVisits: urlData.todayVisits || 0,
            totalVisits: urlData.totalVisits || 0,
            dailyLimit: 3000,
            logs: urlData.logs || []
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 방문 추적 API
app.post('/track/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    console.log('=== Tracking visit for:', shortCode, '===');
    
    try {
        // DB 로드
        const db = loadDB();
        if (!db[shortCode]) {
            return res.status(404).json({ error: 'URL을 찾을 수 없습니다' });
        }

        // 방문수 증가
        db[shortCode].todayVisits = (db[shortCode].todayVisits || 0) + 1;
        db[shortCode].totalVisits = (db[shortCode].totalVisits || 0) + 1;
        
        // DB 저장 (saveDB 함수 사용)
        saveDB(db);
        
        console.log('Visit counts updated:', {
            today: db[shortCode].todayVisits,
            total: db[shortCode].totalVisits
        });
        
        res.json({ 
            success: true, 
            todayVisits: db[shortCode].todayVisits, 
            totalVisits: db[shortCode].totalVisits 
        });
    } catch (error) {
        console.error('Error in /track:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 전체 URL 삭제 API
app.delete('/delete-all', (req, res) => {
    try {
        const db = loadDB();
        // 모든 URL 삭제: 객체를 빈 객체로 만듦
        const emptyDB = {};
        saveDB(emptyDB);
        res.json({ success: true, message: '모든 URL이 삭제되었습니다.' });
    } catch (error) {
        console.error('Error in /delete-all:', error);
        res.status(500).json({ success: false, error: '전체 삭제 중 서버 오류' });
    }
});

// 13:30 기준 3시간 간격 (01:30, 04:30, 07:30, 10:30, 13:30, 16:30, 19:30, 22:30)
cron.schedule('30 1,4,7,10,13,16,19,22 * * *', async () => {
  console.log('⏰ 예약된 크롤링 작업 시작 (30분, 3시간 간격)');
  try {
    await crawlAllCategories();
    console.log('✅ 예약된 크롤링 작업 완료 (30분, 3시간 간격)');
  } catch (error) {
    console.error('❌ 예약된 작업 중 오류:', error);
  }
}, {
  timezone: 'Asia/Seoul'
});

function saveLastCrawled() {
  const now = new Date().toISOString();
  require('fs').writeFileSync(LAST_CRAWLED_FILE, JSON.stringify({ lastCrawled: now }));
}

function getLastCrawled() {
  try {
    const data = require('fs').readFileSync(LAST_CRAWLED_FILE, 'utf8');
    return JSON.parse(data).lastCrawled;
  } catch {
    return null;
  }
}

// 크롤링 함수 내부에서 마지막 시각 저장
async function crawlAllCategories() {
  // ... 기존 크롤링 코드 ...
  // 크롤링 완료 후 마지막 시각 저장
  saveLastCrawled();
}

// 마지막 크롤링 시각 API
app.get('/api/last-crawled', (req, res) => {
  const last = getLastCrawled();
  res.json({ lastCrawled: last });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
