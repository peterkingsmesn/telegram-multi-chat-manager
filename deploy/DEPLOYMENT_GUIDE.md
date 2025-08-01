# 배포 가이드

## 서버 구조

### 개선된 서버 (telegram_server.py)
- **특징**:
  - 향상된 에러 처리 및 로깅
  - 세션 관리 유틸리티
  - 설정 파일 기반 동작
  - 자동 재연결 기능
  - API 등록 엔드포인트

### 레거시 서버 (proxy_server.py)
- 기본 기능만 제공
- 문제 발생 시 대체용

## API 엔드포인트

### 설정 관리
- `GET /health` - 서버 상태 확인
- `GET /api/config/status` - 설정 상태 조회
- `POST /api/config/add` - API/프록시 설정 추가

### 인증
- `POST /api/connect` - 텔레그램 연결
- `POST /api/verify` - 인증 코드 확인
- `POST /api/disconnect` - 연결 해제

### 그룹 관리
- `POST /api/groups` - 그룹 목록 조회

### 메시지 전송
- `POST /api/send/message` - 텍스트 메시지 전송
- `POST /api/send/images` - 이미지 전송

### 세션 관리
- `GET /api/sessions` - 세션 목록 조회
- `POST /api/sessions/cleanup` - 세션 정리

## 디렉토리 구조

```
deploy/
├── server/
│   ├── telegram_server.py  # 개선된 서버
│   ├── proxy_server.py     # 레거시 서버
│   ├── utils.py            # 유틸리티 모듈
│   ├── requirements.txt    # Python 의존성
│   ├── sessions/           # 텔레그램 세션 (자동 생성)
│   ├── logs/               # 로그 파일 (자동 생성)
│   └── temp/               # 임시 파일 (자동 생성)
├── index.html              # 웹 UI
├── app.js                  # 프론트엔드 로직
├── styles.css              # 스타일시트
├── config_client.js        # 클라이언트 설정
├── config.json             # 서버 설정 (생성 필요)
├── config_example.json     # 설정 예제
├── install.bat             # 설치 스크립트
├── start_server.bat        # 서버 시작 스크립트
└── README.md               # 사용 설명서
```

## 배포 절차

### 1. 설치
```bash
# 설치 스크립트 실행
install.bat
```

### 2. 설정
1. `config.json` 파일 편집
2. Telegram API 정보 입력
3. 프록시 정보 입력 (선택사항)

### 3. 서버 시작
```bash
start_server.bat
```

### 4. 웹 UI 접속
- 브라우저에서 `index.html` 열기
- 또는 웹 서버로 호스팅

## 문제 해결

### 서버가 시작되지 않음
1. Python 설치 확인
2. 의존성 설치 확인 (`pip install -r requirements.txt`)
3. 포트 5000이 사용 중인지 확인

### 세션 오류
1. `server/sessions/` 폴더의 `.session-journal` 파일 삭제
2. API 엔드포인트 `/api/sessions/cleanup` 호출

### 연결 오류
1. API 키와 해시 확인
2. 전화번호 형식 확인 (+국가코드)
3. 프록시 설정 확인 (사용하는 경우)

## 보안 권장사항

1. **설정 파일 보호**
   - `config.json`을 버전 관리에서 제외
   - 적절한 파일 권한 설정

2. **HTTPS 사용**
   - 프로덕션 환경에서는 HTTPS 필수
   - nginx 또는 Apache 리버스 프록시 사용

3. **접근 제한**
   - IP 화이트리스트 설정
   - 기본 인증 추가

4. **로그 관리**
   - 정기적인 로그 로테이션
   - 민감한 정보 로깅 방지