const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');
const User = require('./models/User');
const Url = require('./models/Url');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

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

// 세션 미들웨어 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
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

// 기본 라우트 설정
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'url.html'));
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/multiple', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'multiple.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    if (req.session.user && req.session.user.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/login');
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        };
        
        res.json({
            success: true,
            user: {
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin
            },
            redirectTo: user.isAdmin ? '/admin' : '/dashboard'
        });
    } catch (error) {
        console.error('로그인 중 오류:', error);
        res.status(500).json({ success: false, message: '로그인 중 오류가 발생했습니다.' });
    }
});

// URL 단축 API
app.post('/shorten', async (req, res) => {
    const longUrl = req.body.url;
    if (!longUrl) {
        return res.status(400).json({ error: 'URL 누락' });
    }
    
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i;
    if (!urlPattern.test(longUrl)) {
        return res.status(400).json({ error: '유효하지 않은 URL 형식입니다.' });
    }
    
    try {
        let shortCode;
        let isUnique = false;
        
        // 중복되지 않는 shortCode 생성
        while (!isUnique) {
            shortCode = generateShortCode();
            const existingUrl = await Url.findOne({ shortCode });
            if (!existingUrl) {
                isUnique = true;
            }
        }
        
        const ip = getClientIp(req);
        const userId = req.session.user ? req.session.user.id : null;
        const username = req.session.user ? req.session.user.username : null;
        
        const newUrl = new Url({
            shortCode,
            longUrl,
            shortUrl: `${BASE_URL}/${shortCode}`,
            ip,
            userId,
            username,
            createdAt: new Date(),
            lastReset: new Date()
        });
        
        await newUrl.save();
        
        res.json({
            shortUrl: newUrl.shortUrl,
            shortCode,
            username
        });
    } catch (error) {
        console.error('URL 단축 중 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// URL 리다이렉트
app.get('/:shortCode', async (req, res, next) => {
    const { shortCode } = req.params;
    
    if (shortCode === 'dashboard' || shortCode === 'multiple' || shortCode.includes('.')) {
        return next();
    }
    
    try {
        const url = await Url.findOne({ shortCode });
        
        if (!url) {
            return res.status(404).send('유효하지 않은 단축 URL입니다.');
        }
        
        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        const botUserAgents = [/bot/i, /spider/i, /crawl/i, /monitor/i, /render/i, /health/i];
        const isBot = botUserAgents.some(re => re.test(userAgent));
        
        if (!isBot) {
            if (url.todayVisits >= 5000) {
                return res.status(429).send('하루 트래픽(5,000회) 초과');
            }
            
            url.todayVisits += 1;
            url.totalVisits += 1;
            url.logs.unshift({ ip, time: new Date() });
            
            if (url.logs.length > 100) {
                url.logs = url.logs.slice(0, 100);
            }
            
            await url.save();
        }
        
        const targetUrl = url.longUrl.startsWith('http') ? url.longUrl : 'https://' + url.longUrl;
        
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        
        return res.redirect(302, targetUrl);
    } catch (error) {
        console.error('리다이렉트 중 오류:', error);
        res.status(500).send('서버 오류');
    }
});

// URL 목록 조회
app.get('/urls', async (req, res) => {
    try {
        const isAdmin = req.session.user && req.session.user.isAdmin;
        const currentUserId = req.session.user ? req.session.user.id : null;
        
        let query = {};
        if (!isAdmin && currentUserId) {
            query.userId = currentUserId;
        } else if (!currentUserId) {
            return res.json([]);
        }
        
        const urls = await Url.find(query)
            .sort({ createdAt: -1 })
            .select('-__v')
            .lean();
            
        res.json(urls);
    } catch (error) {
        console.error('URL 목록 조회 중 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 매일 자정에 todayVisits 초기화
cron.schedule('0 0 * * *', async () => {
    try {
        await Url.updateMany({}, {
            $set: {
                todayVisits: 0,
                lastReset: new Date()
            }
        });
        console.log('✅ 오늘 방문자 수 초기화 완료');
    } catch (error) {
        console.error('❌ 방문자 수 초기화 중 오류:', error);
    }
}, {
    timezone: 'Asia/Seoul'
});

// 유틸리티 함수들
function generateShortCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getClientIp(req) {
    let ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             '';
    
    if (typeof ip === 'string' && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    
    if (ip.includes('::ffff:')) {
        ip = ip.substring(7);
    }
    
    return ip;
}

const BASE_URL = process.env.NODE_ENV === 'production'
    ? (process.env.DOMAIN || 'https://hwaseon-url.com')
    : `http://localhost:${PORT}`;

// 기본 관리자 계정 생성
async function createDefaultAdminIfNeeded() {
    try {
        const userCount = await User.countDocuments();
        
        if (userCount > 0) {
            return;
        }
        
        const adminUsername = 'hwaseonad';
        const adminPassword = 'hwaseon@00';
        const adminEmail = 'gt.min@hawseon.com';
        
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
        
        const adminUser = new User({
            id: Date.now().toString(),
            username: adminUsername,
            passwordHash,
            email: adminEmail,
            isAdmin: true,
            createdAt: new Date()
        });
        
        await adminUser.save();
        
        console.log('기본 관리자 계정이 생성되었습니다:');
        console.log(`아이디: ${adminUsername}`);
        console.log(`비밀번호: ${adminPassword}`);
    } catch (error) {
        console.error('기본 관리자 계정 생성 중 오류:', error);
    }
}

// 서버 시작
app.listen(PORT, async () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    await connectDB();
    await createDefaultAdminIfNeeded();
});
