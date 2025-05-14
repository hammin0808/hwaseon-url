const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');
const { backupUrlToMongo } = require('./backup/mongoBackup');
require('dotenv').config(); // 환경 변수 로드


const app = express();
const PORT = process.env.PORT || 5001;
const DB_FILE = './db.json';
const LAST_CRAWLED_FILE = './last_crawled.json';
const USERS_FILE = './users.json';


// CORS 설정
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://hwaseon-url.onrender.com', 'https://hwaseon-url.com'] 
        : ['http://localhost:5001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// body parser 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'hwaseon-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 24시간
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        sameSite: 'lax'
    }
}));

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'public')));

// 세션 디버깅 미들웨어
app.use((req, res, next) => {
    console.log('Session Debug:', {
        sessionID: req.sessionID,
        user: req.session.user,
        path: req.path
    });
    next();
});

// 로그인 상태 확인 미들웨어
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: '로그인이 필요합니다.' 
        });
    }
    next();
};

// 인증 관련 라우트
// 로그인 페이지
app.get('/login', (req, res) => {
    // 이미 로그인된 경우 대시보드로 리다이렉트
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

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

// 대시보드 페이지 - 인증 필요
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/login');
    }
});

// 대시보드 페이지 (기존 경로도 유지)
app.get('/dashboard.html', (req, res) => {
  console.log('dashboard.html 접근 시도:', req.session.id, req.session.user ? req.session.user.username : 'No user');
  
  if (req.session.user) {
    console.log('인증된 사용자가 dashboard.html 접근:', req.session.user.username);
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } else {
    console.log('인증되지 않은 사용자가 dashboard.html 접근 시도');
    res.redirect('/login');
  }
});

// 관리자 비밀번호 검증
async function verifyAdminPassword(password) {
    // 관리자 비밀번호 상수
    const ADMIN_PASSWORD = "hwaseon@00";
    return password === ADMIN_PASSWORD;
}

// 관리자 페이지
app.get('/admin', (req, res) => {
    if (req.session.user && req.session.user.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/login');
    }
});

// 관리자 로그인 API
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, message: '비밀번호를 입력해주세요.' });
    }
    
    console.log(`관리자 로그인 시도: session_id=${req.session.id}`);
    
    // 관리자 비밀번호 검증
    const isValidPassword = password === "hwaseon@00";
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '관리자 비밀번호가 일치하지 않습니다.' });
    }
    
    // 관리자 사용자 정보 (기본 관리자)
    const adminUser = {
      id: 'admin',
      username: 'hwaseonad',
      email: 'gt.min@hawseon.com',
      isAdmin: true
    };
    
    // 세션에 사용자 정보 저장
    req.session.user = adminUser;
    
    // 세션 저장 확인
    req.session.save(err => {
      if (err) {
        console.error('세션 저장 오류:', err);
        return res.status(500).json({ success: false, message: '세션 저장 중 오류가 발생했습니다.' });
      }
      
      console.log('관리자 로그인 성공:', adminUser.username, req.session.id);
      res.json({ success: true, user: adminUser });
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 로그인 API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('로그인 시도:', { username, sessionID: req.sessionID });
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: '아이디와 비밀번호를 모두 입력해주세요.' 
        });
    }
    
    try {
        // users.json에서 사용자 정보 로드
        const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = usersData.users.find(u => u.username === username);
        
        console.log('찾은 사용자:', user ? { 
            username: user.username, 
            isAdmin: user.isAdmin 
        } : '없음');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '아이디 또는 비밀번호가 일치하지 않습니다.'
            });
        }
        
        // bcrypt를 사용하여 비밀번호 검증
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        
        console.log('비밀번호 검증 결과:', isValidPassword);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '아이디 또는 비밀번호가 일치하지 않습니다.'
            });
        }
        
        // 세션에 사용자 정보 저장
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        };
        
        // 세션 저장
        req.session.save(err => {
            if (err) {
                console.error('세션 저장 오류:', err);
                return res.status(500).json({
                    success: false,
                    message: '세션 저장 중 오류가 발생했습니다.'
                });
            }
            
            console.log('로그인 성공:', user.username, req.session.id);
            res.json({
                success: true,
                user: {
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin
                },
                redirectTo: user.isAdmin ? '/admin' : '/dashboard'
            });
        });
        
    } catch (error) {
        console.error('로그인 처리 중 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 로그아웃 API
app.post('/api/logout', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'unknown';
    console.log('로그아웃:', { username, sessionID: req.sessionID });
    
    req.session.destroy((err) => {
        if (err) {
            console.error('로그아웃 에러:', err);
            return res.status(500).json({ 
                success: false, 
                message: '로그아웃 처리 중 오류가 발생했습니다.' 
            });
        }
        res.json({ success: true, message: '로그아웃되었습니다.' });
    });
});

// 현재 로그인한 사용자 정보 API
app.get('/api/me', (req, res) => {
    console.log('사용자 정보 요청:', {
        sessionID: req.sessionID,
        user: req.session.user ? req.session.user.username : 'none'
    });
    
    if (req.session.user) {
        res.json({ 
            success: true, 
            user: req.session.user 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: '로그인이 필요합니다.' 
        });
    }
});

// 관리자 권한 확인 API
app.get('/api/admin/auth', (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    res.json({ success: true, isAdmin: true });
  } else {
    res.json({ success: false, isAdmin: false });
  }
});

// 사용자 목록 조회 API (관리자 전용)
app.get('/api/admin/users', (req, res) => {
  // 관리자 권한 확인
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  
  try {
    const userData = loadUsers();
    res.json({ success: true, users: userData.users });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ success: false, message: '사용자 목록을 불러오는데 실패했습니다.' });
  }
});

// 사용자 생성 API (관리자 전용)
app.post('/api/admin/users', async (req, res) => {
  // 관리자 권한 확인
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '사용자명과 비밀번호는 필수입니다.' });
    }
    
    // 사용자 데이터 로드
    const userData = loadUsers();
    
    // 사용자명 중복 확인
    if (userData.users.some(u => u.username === username)) {
      return res.status(400).json({ success: false, message: '이미 존재하는 사용자명입니다.' });
    }
    
    // 비밀번호 해시화
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 새 사용자 생성
    const newUser = {
      id: Date.now().toString(),
      username,
      passwordHash,
      email: email || null,
      isAdmin: false,
      createdAt: new Date().toISOString()
    };
    
    // 사용자 추가
    userData.users.push(newUser);
    
    // 사용자 데이터 저장
    if (!saveUsers(userData)) {
      return res.status(500).json({ success: false, message: '사용자 저장에 실패했습니다.' });
    }
    
    // 비밀번호 제외하고 응답
    const userResponse = { ...newUser };
    delete userResponse.passwordHash;
    
    res.json({ success: true, user: userResponse });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: '사용자 생성 중 오류가 발생했습니다.' });
  }
});

// 사용자 삭제 API (관리자 전용)
app.delete('/api/admin/users/:userId', (req, res) => {
  // 관리자 권한 확인
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  
  try {
    const userId = req.params.userId;
    
    // 사용자 데이터 로드
    const userData = loadUsers();
    
    // 삭제할 사용자 찾기
    const userIndex = userData.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 관리자 계정은 삭제 불가
    if (userData.users[userIndex].isAdmin) {
      return res.status(400).json({ success: false, message: '관리자 계정은 삭제할 수 없습니다.' });
    }
    
    // 사용자 삭제
    userData.users.splice(userIndex, 1);
    
    // 사용자 데이터 저장
    if (!saveUsers(userData)) {
      return res.status(500).json({ success: false, message: '사용자 삭제 저장에 실패했습니다.' });
    }
    
    res.json({ success: true, message: '사용자가 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: '사용자 삭제 중 오류가 발생했습니다.' });
  }
});

// 모든 URL 목록 조회 API
app.get('/urls', (req, res) => {
    const db = loadDB();
    console.log('URLs 조회 요청:', { 
        sessionId: req.session.id,
        user: req.session.user ? req.session.user.username : null
    });
    
    // 현재 사용자 정보 확인
    const isAdmin = req.session.user && req.session.user.isAdmin;
    const currentUserId = req.session.user ? req.session.user.id : null;
    const currentUsername = req.session.user ? req.session.user.username : null;
    
    // URL 목록 필터링
    const urls = Object.keys(db)
        .filter(shortCode => {
            // 관리자는 모든 URL 볼 수 있음
            if (isAdmin) return true;
            
            // 로그인한 일반 사용자는 본인이 만든 URL만 볼 수 있음
            if (currentUserId) {
                return db[shortCode].userId === currentUserId;
            }
            
            // 로그인하지 않은 경우 아무것도 볼 수 없음 (비회원)
            return false;
        })
        .sort((a, b) => {
            // 최신순 정렬 (createdAt 기준)
            const dateA = new Date(db[a].createdAt);
            const dateB = new Date(db[b].createdAt);
            return dateB - dateA;
        })
        .map(shortCode => {
            // 사용자 정보 추가
            let urlData = db[shortCode];
            let displayUsername = '비회원';
            
            // URL에 사용자 정보가 저장되어 있는 경우
            if (urlData.username) {
                displayUsername = urlData.username;
            }
            
            return {
                shortCode: shortCode,
                shortUrl: urlData.shortUrl,
                longUrl: urlData.longUrl,
                todayVisits: urlData.todayVisits || 0,
                totalVisits: urlData.totalVisits || 0,
                createdAt: urlData.createdAt,
                ip: urlData.ip,
                userId: urlData.userId,
                username: displayUsername,
                memo: urlData.memo || ''
            };
        });
    
    console.log(`URL 조회 결과: ${urls.length}개 URL, 사용자: ${currentUsername || '비회원'}, 관리자: ${isAdmin}`);
    res.json(urls);
});

// 용자 데이터 저장 함수
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

// 사용자 데이터 로드 함수
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            return { users: [] };
        }
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (error) {
        console.error('Error loading users:', error);
        return { users: [] };
    }
}

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

        // 6. MongoDB에 백업
        Object.entries(data).forEach(async ([shortCode, urlData]) => {
            urlData.shortCode = shortCode;
            await backupUrlToMongo(urlData);
        });

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

// 클라이언트의 실제 IP 주소 추출
function getClientIp(req) {
  // 프록시 서버, CDN 등을 통과했을 때 실제 클라이언트 IP 추출
  let ip = req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           '';
  
  // x-forwarded-for는 여러 IP가 콤마로 구분되어 있을 수 있음 (첫번째가 원래 클라이언트 IP)
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // ::ffff:127.0.0.1 같은 IPv6 형태의 로컬호스트 처리
  if (ip.includes('::ffff:')) {
    ip = ip.substring(7);
  }
  
  return ip;
}

// 단축 URL 생성 시 도메인 설정
const BASE_URL = process.env.NODE_ENV === 'production'
  ? (process.env.DOMAIN || 'https://hwaseon-url.com')
  : `http://localhost:${PORT}`;

// URL 단축 API - 사용자 정보 추가
app.post('/shorten', (req, res) => {
    const longUrl = req.body.url;
    if (!longUrl) {
        return res.status(400).json({ error: 'URL 누락' });
    }
    
    // URL 유효성 검사 (간단한 형태)
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i;
    if (!urlPattern.test(longUrl)) {
        return res.status(400).json({ error: '유효하지 않은 URL 형식입니다.' });
    }
    
    // 세션 정보 로깅
    console.log('URL 단축 요청 세션 정보:', {
        sessionId: req.session.id,
        user: req.session.user,
        cookies: req.headers.cookie
    });
    
    let shortCode;
    const db = loadDB();
    do {
        shortCode = generateShortCode();
    } while (db[shortCode]);
    
    const ip = getClientIp(req);
    
    // 사용자 정보가 있으면 추가
    const userId = req.session.user ? req.session.user.id : null;
    const username = req.session.user ? req.session.user.username : null;
    
    console.log('URL 단축 시 저장되는 사용자 정보:', { userId, username });
    
    db[shortCode] = {
        longUrl: longUrl,
        shortUrl: `${BASE_URL}/${shortCode}`,
        todayVisits: 0,
        totalVisits: 0,
        createdAt: new Date().toISOString(),
        lastReset: new Date().toISOString(),
        ip: ip,
        logs: [],
        userId: userId,
        username: username // 사용자 이름 저장
    };
    
    saveDB(db);
    
    // 디버깅 로그 추가
    console.log(`URL 단축 완료: ${shortCode}, 사용자: ${username || '비회원'}`);
    
    res.json({ 
        shortUrl: db[shortCode].shortUrl,
        shortCode: shortCode,
        username: username // 응답에 사용자 이름 추가
    });
});

// 여러 URL 단축 API - 사용자 정보 추가
app.post('/shorten-multiple', (req, res) => {
    const urls = req.body.urls;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'URL 목록이 필요합니다' });
    }

    // 세션 정보 로깅
    console.log('다중 URL 단축 요청 세션 정보:', {
        sessionId: req.session.id,
        user: req.session.user,
        cookies: req.headers.cookie
    });

    const results = [];
    const db = loadDB();
    // 클라이언트 IP 추출 (로컬서버 포함)
    const ip = getClientIp(req);
    
    // 사용자 정보가 있으면 추가
    const userId = req.session.user ? req.session.user.id : null;
    const username = req.session.user ? req.session.user.username : null;
    
    console.log('다중 URL 단축 시 저장되는 사용자 정보:', { userId, username });

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
            ip: ip,
            userId: userId,
            username: username // 사용자 이름 저장
        };

        results.push({
            originalUrl: longUrl,
            shortUrl: db[shortCode].shortUrl,
            shortCode: shortCode,
            username: username // 결과에 사용자 이름 추가
        });
    }

    // DB 저장
    saveDB(db);
    console.log(`다중 URL 단축 완료: ${results.length}개, 사용자: ${username || '비회원'}`);

    res.json({ 
        success: true,
        urls: results
    });
});

// URL 삭제 API - 본인 또는 관리자만 삭제 가능
app.delete('/urls/:shortCode', (req, res) => {
  try {
    const { shortCode } = req.params;
    const db = loadDB();
    
    if (!db[shortCode]) {
      return res.status(404).json({ error: 'URL을 찾을 수 없습니다' });
    }
    
    // 사용자 권한 확인
    const userId = req.session.user ? req.session.user.id : null;
    const isAdmin = req.session.user ? req.session.user.isAdmin : false;
    
    // 관리자거나 본인의 URL인 경우만 삭제 허용
    if (!isAdmin && db[shortCode].userId !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다' });
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
    // logs 기록
    if (!db[shortCode].logs) db[shortCode].logs = [];
    let ip = getClientIp(req);
    if (typeof ip === 'string' && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    const userAgent = req.headers['user-agent'] || '';
    const botUserAgents = [/bot/i, /spider/i, /crawl/i, /monitor/i, /render/i, /health/i];
    const isBot = botUserAgents.some(re => re.test(userAgent));
    const now = new Date();
    // 하루 트래픽 제한: 5,000
    if (!isBot && (db[shortCode].todayVisits || 0) >= 5000) {
        return res.status(429).send('하루 트래픽(5,000회) 초과');
    }
    // 방문자수 카운트 (중복방문방지 없음)
    if (!isBot) {
        db[shortCode].todayVisits = (db[shortCode].todayVisits || 0) + 1;
        db[shortCode].totalVisits = (db[shortCode].totalVisits || 0) + 1;
        db[shortCode].logs.unshift({ ip, time: now.toISOString() });
        if (db[shortCode].logs.length > 100) db[shortCode].logs = db[shortCode].logs.slice(0, 100);
    }
    // DB 저장
    saveDB(db);
    // 리다이렉트
    const targetUrl = db[shortCode].longUrl.startsWith('http') 
        ? db[shortCode].longUrl 
        : 'https://' + db[shortCode].longUrl;
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
            dailyLimit: 5000,
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

// 전체 URL 삭제 API - 관리자만 가능 또는 본인 것만 삭제
app.delete('/delete-all', (req, res) => {
    try {
        // 관리자 또는 로그인 확인
        const userId = req.session.user ? req.session.user.id : null;
        const isAdmin = req.session.user ? req.session.user.isAdmin : false;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
        }
        
        const db = loadDB();
        
        if (isAdmin) {
            // 관리자는 모든 URL 삭제 가능
            saveDB({});
            res.json({ success: true, message: '모든 URL이 삭제되었습니다.' });
        } else {
            // 일반 사용자는 자신의 URL만 삭제
            const filteredDb = {};
            for (const [shortCode, data] of Object.entries(db)) {
                if (data.userId !== userId) {
                    filteredDb[shortCode] = data;
                }
            }
            saveDB(filteredDb);
            res.json({ success: true, message: '내 URL이 모두 삭제되었습니다.' });
        }
    } catch (error) {
        console.error('Error in /delete-all:', error);
        res.status(500).json({ success: false, error: '전체 삭제 중 서버 오류' });
    }
});

// 매일 자정(00:00)에 todayVisits 카운터 초기화
cron.schedule('0 0 * * *', () => {
    console.log('🕛 자정이 되어 오늘 방문자 수를 초기화합니다.');
    try {
        const db = loadDB();
        
        // 각 URL의 todayVisits를 0으로 초기화
        for (const shortCode in db) {
            if (db.hasOwnProperty(shortCode)) {
                db[shortCode].todayVisits = 0;
                db[shortCode].lastReset = new Date().toISOString();
            }
        }
        
        // 변경된 DB 저장
        saveDB(db);
        console.log('✅ 오늘 방문자 수 초기화 완료');
    } catch (error) {
        console.error('❌ 방문자 수 초기화 중 오류:', error);
    }
}, {
    timezone: 'Asia/Seoul'  // 한국 시간대 기준
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

// 회원가입 처리 API (관리자만 사용 가능)
app.post('/api/signup', async (req, res) => {
  const { username, password, email, adminKey, isAdmin } = req.body;
  
  // 관리자 키 확인 (실제 사용 시 보안 강화 필요)
  const ADMIN_KEY = 'hwaseon-admin-key';
  const isAdminRequest = adminKey === ADMIN_KEY;
  
  if (!isAdminRequest) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 모두 입력해주세요.' });
  }
  
  // 사용자 데이터 로드
  const userData = loadUsers();
  
  // 아이디 중복 확인
  if (userData.users.some(u => u.username === username)) {
    return res.status(400).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
  }
  
  try {
    // 비밀번호 해싱
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 사용자 추가
    const newUser = {
      id: Date.now().toString(),
      username,
      passwordHash,
      email: email || '',
      isAdmin: isAdmin === true,
      createdAt: new Date().toISOString()
    };
    
    userData.users.push(newUser);
    
    // 사용자 데이터 저장
    if (saveUsers(userData)) {
      res.json({ success: true, message: '사용자 계정이 생성되었습니다.' });
    } else {
      res.status(500).json({ success: false, message: '계정 생성 중 오류가 발생했습니다.' });
    }
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ success: false, message: '계정 생성 중 오류가 발생했습니다.' });
  }
});

// 사용자 목록 조회 API (관리자만 사용 가능)
app.get('/api/users', (req, res) => {
  const { adminKey } = req.query;
  
  // 관리자 키 확인
  const ADMIN_KEY = 'hwaseon-admin-key';
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  
  // 세션 체크
  if (!req.session.user || !req.session.user.isAdmin) {
    // 비로그인 또는 비관리자도 키가 있으면 조회 가능하도록 허용
    // 실제 서비스에서는 세션 체크를 더 엄격하게 할 수 있음
  }
  
  try {
    const userData = loadUsers();
    
    // 비밀번호 해시 등 민감 정보 제외하고 전송
    const users = userData.users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    }));
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ success: false, message: '사용자 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 사용자 삭제 API (관리자만 사용 가능)
app.delete('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { adminKey } = req.body;
  
  // 관리자 키 확인
  const ADMIN_KEY = 'hwaseon-admin-key';
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  
  try {
    const userData = loadUsers();
    
    // 사용자 찾기
    const userIndex = userData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 자기 자신은 삭제 불가능
    if (req.session.user && req.session.user.id === userId) {
      return res.status(403).json({ success: false, message: '자기 자신의 계정은 삭제할 수 없습니다.' });
    }
    
    // 사용자 삭제
    userData.users.splice(userIndex, 1);
    
    // 저장
    if (saveUsers(userData)) {
      res.json({ success: true, message: '사용자가 삭제되었습니다.' });
    } else {
      res.status(500).json({ success: false, message: '사용자 삭제 중 오류가 발생했습니다.' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: '사용자 삭제 중 오류가 발생했습니다.' });
  }
});

// 데이터 백업 API
app.get('/api/backup', (req, res) => {
    try {
        // 관리자 권한 확인
        if (!req.session.user || !req.session.user.isAdmin) {
            return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        }

        // 백업할 데이터 수집
        const backup = {
            timestamp: new Date().toISOString(),
            urls: loadDB(),
            users: loadUsers(),
            lastCrawled: getLastCrawled()
        };

        // Content-Disposition 헤더 설정으로 다운로드되게 함
        res.setHeader('Content-Disposition', `attachment; filename=hwaseon-url-backup-${new Date().toISOString().slice(0,10)}.json`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);
    } catch (error) {
        console.error('백업 생성 중 오류:', error);
        res.status(500).json({ success: false, message: '백업 생성 중 오류가 발생했습니다.' });
    }
});

// 데이터 복원 API
app.post('/api/restore', express.json({limit: '50mb'}), async (req, res) => {
    try {
        // 관리자 권한 확인
        if (!req.session.user || !req.session.user.isAdmin) {
            return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        }

        const backupData = req.body;

        // 백업 데이터 유효성 검사
        if (!backupData || !backupData.urls || !backupData.users) {
            return res.status(400).json({ success: false, message: '유효하지 않은 백업 데이터입니다.' });
        }

        // 데이터 복원
        saveDB(backupData.urls);
        saveUsers(backupData.users);
        
        if (backupData.lastCrawled) {
            fs.writeFileSync(LAST_CRAWLED_FILE, JSON.stringify({ lastCrawled: backupData.lastCrawled }));
        }

        res.json({ success: true, message: '데이터가 성공적으로 복원되었습니다.' });
    } catch (error) {
        console.error('데이터 복원 중 오류:', error);
        res.status(500).json({ success: false, message: '데이터 복원 중 오류가 발생했습니다.' });
    }
});

// 자동 백업 설정 (매일 자정)
cron.schedule('0 0 * * *', async () => {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            urls: loadDB(),
            users: loadUsers(),
            lastCrawled: getLastCrawled()
        };

        // 백업 디렉토리 생성
        if (!fs.existsSync('./backups')) {
            fs.mkdirSync('./backups');
        }

        // 백업 파일 저장
        const backupPath = path.join('./backups', `backup-${new Date().toISOString().slice(0,10)}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

        // 30일 이상 된 백업 파일 삭제
        const files = fs.readdirSync('./backups');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        files.forEach(file => {
            const filePath = path.join('./backups', file);
            const stats = fs.statSync(filePath);
            if (stats.mtime < thirtyDaysAgo) {
                fs.unlinkSync(filePath);
            }
        });

        console.log('✅ 자동 백업 완료:', backupPath);
    } catch (error) {
        console.error('❌ 자동 백업 중 오류:', error);
    }
}, {
    timezone: 'Asia/Seoul'
});



// 서버 시작
app.listen(PORT, async () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  
  // MongoDB 연결
  await connectDB();
  
  // 현재 데이터를 MongoDB에 백업
  const currentData = loadDB();
  Object.entries(currentData).forEach(async ([shortCode, urlData]) => {
      urlData.shortCode = shortCode;
      await backupUrlToMongo(urlData);
  });
  
  // 기본 관리자 계정 생성 (초기 설정)
  await createDefaultAdminIfNeeded();
});

// 기본 관리자 계정 생성 함수
async function createDefaultAdminIfNeeded() {
  try {
    const userData = loadUsers();
    
    // 이미 사용자가 있는지 확인
    if (userData.users.length > 0) {
      return; // 이미 사용자가 있으면 생성하지 않음
    }
    
    // 관리자 계정 생성
    const adminUsername = 'hwaseonad';
    const adminPassword = 'hwaseon@00';
    const adminEmail = 'gt.min@hawseon.com';
    
    // 비밀번호 해싱
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    
    // 관리자 사용자 추가
    const adminUser = {
      id: Date.now().toString(),
      username: adminUsername,
      passwordHash,
      email: adminEmail,
      isAdmin: true,
      createdAt: new Date().toISOString()
    };
    
    userData.users.push(adminUser);
    
    // 사용자 데이터 저장
    if (saveUsers(userData)) {
      console.log('기본 관리자 계정이 생성되었습니다:');
      console.log(`아이디: ${adminUsername}`);
      console.log(`비밀번호: ${adminPassword}`);
    } else {
      console.error('기본 관리자 계정 생성 중 오류가 발생했습니다.');
    }
  } catch (error) {
    console.error('기본 관리자 계정 생성 중 오류:', error);
  }
}
