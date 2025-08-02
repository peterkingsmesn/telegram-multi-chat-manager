# 텔레그램 멀티 챗 매니저 - 배포 가이드

## 📦 배포 패키지 구성

### 포함되는 파일:
```
deploy/
├── server/
│   ├── telegram_server.py      # 메인 서버
│   ├── api_register.py         # API 등록 모듈
│   ├── auth.py                 # 인증 모듈
│   ├── utils.py                # 유틸리티
│   ├── decorators.py           # 데코레이터
│   ├── app_factory.py          # Flask 앱 팩토리
│   └── requirements.txt        # Python 의존성
├── index.html                  # 메인 페이지
├── login.html                  # 로그인 페이지
├── api_register.html           # API 등록 페이지
├── app.js                      # 클라이언트 로직
├── config_client.js            # 클라이언트 설정
├── styles.css                  # 스타일
├── start.bat                   # 시작 스크립트
├── .env.example                # 환경 변수 예시
└── .gitignore                  # Git 제외 목록
```

### ❌ 포함되지 않는 파일:
- `license_server/` 폴더 전체 (중앙 관리)
- `.env` 파일 (보안상 제외)
- `config.json` (민감한 설정)
- 세션 파일들 (`*.session`)
- 로그 파일들 (`*.log`)

## 🚀 배포 절차

### 1. 중앙 라이센스 서버 설정 (관리자만)
```bash
# 별도의 서버에서 실행
cd license_server
python server/license_server.py
```

### 2. 클라이언트 배포 준비
```bash
# 배포 패키지 생성
cd deploy
zip -r telegram-manager-v1.0.zip . -x "license_server/*" -x ".env" -x "*.session" -x "*.log"
```

### 3. 클라이언트 설치 (사용자)

#### Step 1: 압축 해제
```bash
unzip telegram-manager-v1.0.zip -d telegram-manager
cd telegram-manager
```

#### Step 2: 환경 설정
```bash
# .env.example을 복사하여 .env 생성
copy .env.example .env

# .env 파일 편집
notepad .env
```

**필수 설정 항목:**
```env
# 라이센스 서버 URL (관리자가 제공)
LICENSE_SERVER_URL=http://your-server-ip:5001

# 고유한 시크릿 키 생성
SECRET_KEY=generate-a-random-secret-key-here
```

#### Step 3: Python 환경 설정
```bash
# Python 3.8+ 필요
python -m venv venv
venv\Scripts\activate

# 의존성 설치
cd server
pip install -r requirements.txt
cd ..
```

#### Step 4: 실행
```bash
# 서버 시작
start.bat

# 브라우저에서 접속
# http://localhost:5000/login.html
```

## 🔒 보안 주의사항

### 1. 라이센스 서버
- **절대 배포하지 마세요!**
- 중앙에서만 운영
- 방화벽으로 접근 제한
- 라이센스 키는 안전하게 관리

### 2. 환경 변수
- `.env` 파일은 절대 공유 금지
- `SECRET_KEY`는 각 설치마다 고유하게 생성
- 프로덕션에서는 `DEBUG=False` 필수

### 3. 네트워크 보안
- 가능하면 VPN 사용
- 방화벽으로 5000번 포트 보호
- 신뢰할 수 있는 네트워크에서만 사용

## 📱 클라이언트 사용법

### 1. 최초 로그인
1. 브라우저에서 `http://localhost:5000/login.html` 접속
2. 라이센스 키 입력 (관리자가 발급)
3. 하드웨어 ID는 자동 생성

### 2. API 등록
1. 메인 화면에서 "API 등록" 클릭
2. 텔레그램 API 정보 입력
3. SMS 인증 진행

### 3. 메시지 전송
1. 등록된 계정 선택
2. 그룹 목록 로드
3. 메시지 작성 및 전송

## 🔧 문제 해결

### 라이센스 서버 연결 실패
```bash
# .env 파일의 LICENSE_SERVER_URL 확인
# 네트워크 연결 상태 확인
ping your-license-server-ip
```

### 포트 충돌
```bash
# 5000번 포트 사용 중인 프로세스 확인
netstat -ano | findstr :5000

# 포트 변경 시 .env 파일 수정
SERVER_PORT=5001
```

### 세션 오류
```bash
# 세션 폴더 생성
mkdir server\sessions

# 손상된 세션 삭제
del server\sessions\*.session
```

## ⚠️ 주의사항

- 라이센스는 하드웨어별로 발급됨
- 하드웨어 변경 시 새 라이센스 필요
- 동시에 여러 곳에서 사용 불가
- 텔레그램 API 제한 준수 필요