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

### 4. 배포 트러블슈팅

#### bcrypt 모듈 오류 해결

Node.js 버전과 bcrypt 네이티브 바이너리 모듈의 호환성 문제가 발생할 수 있습니다. 다음과 같은 오류가 발생한 경우:

```
Error: /opt/render/project/src/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node: invalid ELF header
```

이 문제를 해결하기 위해 다음과 같은 변경이 적용되었습니다:

1. **bcryptjs 사용**: 네이티브 바이너리 의존성이 없는 순수 JavaScript로 구현된 bcryptjs 모듈을 사용하도록 변경했습니다. 이는 모든 Node.js 버전과 플랫폼에서 호환성이 뛰어납니다.

2. **코드 수정**: 코드에서 `require('bcrypt')` 대신 `require('bcryptjs')`로 변경되었습니다. bcryptjs는 bcrypt와 동일한 API를 제공하므로 다른 코드 변경 없이 원활하게 작동합니다.

## 관리자 계정 정보

최초 실행 시 자동으로 생성되는 기본 관리자 계정:
- ID: `hwaseonad`
- 비밀번호: `hwaseon@00`

> **보안 참고사항**: 실제 배포 시 기본 관리자 비밀번호를 필수로 변경하세요.

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```
# 환경 설정
NODE_ENV=production  # 배포 환경: production, 개발 환경: development

# 서버 설정
PORT=5001  # 서버 포트 (Render.com은 자체 포트 할당)

# 도메인 설정
DOMAIN=https://hwaseon-url.onrender.com  # 실제 배포된 도메인으로 변경

# 세션 보안 설정
SESSION_SECRET=random-secure-string  # 보안을 위해 복잡한 무작위 문자열로 변경

# CORS 설정 (추가 도메인이 필요한 경우)
ALLOWED_ORIGINS=https://hwaseon-url.com,https://hwaseon-url.onrender.com
```

### 중요 환경 변수 설명

- **NODE_ENV**: 애플리케이션 실행 환경을 지정합니다. `production`으로 설정하면 보안 설정이 강화됩니다.
- **PORT**: 서버가 실행될 포트를 지정합니다. Render.com에서는 자동으로 `PORT` 환경 변수를 설정합니다.
- **DOMAIN**: 클라이언트에게 제공되는 단축 URL에 사용될 도메인입니다. 배포된 실제 도메인으로 설정해야 합니다.
- **SESSION_SECRET**: 세션 암호화에 사용되는 비밀키입니다. 보안을 위해 복잡하고 긴 문자열로 설정하세요.
- **ALLOWED_ORIGINS**: CORS 허용 도메인 목록입니다. 여러 도메인이 필요한 경우 콤마로 구분합니다.

## 라이선스

ISC 