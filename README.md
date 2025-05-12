# Hwaseon URL Shortener

URL 단축 서비스로, 긴 URL을 짧게 줄여주는 웹 애플리케이션입니다.

## 기능

- URL 단축
- 다중 URL 단축
- 대시보드를 통한 URL 관리
- 사용자 관리 (관리자)
- 방문 통계 추적

## 로컬 실행 방법

1. 필요한 패키지 설치:
```bash
npm install
```

2. 서버 실행:
```bash
npm start
```

3. 브라우저에서 `http://localhost:5001` 접속

## Render.com 배포 가이드

### 1. 준비사항

- Render.com 계정
- GitHub 계정 (코드 저장소 연결용)

### 2. Render.com에 배포하기

1. Render 대시보드에서 "New" 버튼 클릭 후 "Web Service" 선택
2. GitHub 저장소 연결 (필요한 경우 권한 부여)
3. 배포 설정:
   - 이름: `hwaseon-url` (원하는 이름으로 변경 가능)
   - 환경: `Node`
   - 빌드 명령어: `npm install`
   - 시작 명령어: `node server.js`
   - 무료 인스턴스 선택 (선택 사항)

4. 환경 변수 설정 (Advanced 섹션에서 설정):
   - `NODE_ENV`: `production`
   - `PORT`: `5001` (Render는 자동으로 $PORT 변수 지정)
   - `DOMAIN`: 실제 도메인 (e.g. `https://hwaseon-url.onrender.com`)
   - `SESSION_SECRET`: 보안을 위한 복잡한 문자열

5. "Create Web Service" 버튼 클릭하여 배포

### 3. 배포 후 설정

1. 배포된 서비스 URL 확인 (e.g. `https://hwaseon-url.onrender.com`)
2. 필요한 경우 커스텀 도메인 설정:
   - Render 대시보드에서 해당 서비스 선택
   - "Settings" > "Custom Domain" 메뉴에서 도메인 설정

## 관리자 계정 정보

최초 실행 시 자동으로 생성되는 기본 관리자 계정:
- ID: `hwaseonad`
- 비밀번호: `hwaseon@00`

> **보안 참고사항**: 실제 배포 시 기본 관리자 비밀번호를 필수로 변경하세요.

## 환경 변수

`.env.example` 파일을 복사하여 `.env` 파일을 만들고 필요한 설정을 변경하세요.

## 라이선스

ISC 