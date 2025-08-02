# 텔레그램 멀티 챗 매니저

텔레그램 계정을 관리하고 다중 채팅을 효율적으로 관리할 수 있는 Windows 애플리케이션입니다.

## 주요 기능

- 다중 텔레그램 계정 관리
- 화력 계정과 전문가 계정 분리 관리
- 프록시 지원
- 자동 메시지 전송
- 라이센스 기반 인증 시스템
- 자동 업데이트 기능

## 시스템 요구사항

- Windows 10/11 (64비트)
- 최소 4GB RAM
- 인터넷 연결

## 설치 방법

1. [Releases](https://github.com/peterkingsmesn/telegram-multi-chat-manager/releases) 페이지에서 최신 버전 다운로드
2. `Telegram.Multi.Chat.Manager.Setup.exe` 실행
3. 설치 마법사 따라 진행
4. 설치 완료 후 앱 실행

## 사용 방법

1. 라이센스 키로 로그인
2. API 계정 등록 (Telegram API 필요)
3. 그룹 및 채널 동기화
4. 메시지 작성 및 전송

## 개발자 정보

### 프로젝트 구조
```
deploy/              # 배포용 Electron 앱
├── server/         # Python Flask 서버 (포트 5555)
├── main.js         # Electron 메인 프로세스
├── index.html      # 메인 UI
└── package.json    # 프로젝트 설정

license_server/     # 라이센스 관리 서버 (포트 5001)
```

### 빌드 방법
```bash
cd deploy
npm install
npm run dist-win-simple
```

## 라이센스

이 소프트웨어는 상용 라이센스로 제공됩니다.

## 문의사항

문제가 발생하거나 기능 요청이 있으시면 [Issues](https://github.com/peterkingsmesn/telegram-multi-chat-manager/issues) 페이지를 이용해주세요.