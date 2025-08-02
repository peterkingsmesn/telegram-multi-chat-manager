# 텔레그램 멀티 챗 매니저 설치 가이드

## 📦 설치 파일
- **파일명**: `Telegram Multi Chat Manager Setup 1.0.0.exe`
- **위치**: `dist/` 폴더

## 🚀 설치 방법

### 1. Python 설치 (필수)
앱 실행을 위해 Python 3.10 이상이 필요합니다:
1. [Python 공식 사이트](https://www.python.org/downloads/)에서 Python 3.10+ 다운로드
2. 설치 시 **"Add Python to PATH"** 반드시 체크
3. 설치 완료 후 CMD에서 확인: `python --version`

### 2. 앱 설치
1. `Telegram Multi Chat Manager Setup 1.0.0.exe` 실행
2. 설치 경로 선택 (기본: `C:\Program Files\Telegram Multi Chat Manager`)
3. 바탕화면 바로가기 생성 옵션 선택
4. 설치 완료

### 3. 첫 실행 시 Python 패키지 설치
앱을 처음 실행하면 필요한 Python 패키지가 자동으로 설치됩니다:
- telethon (텔레그램 API)
- flask (웹 서버)
- 기타 필수 패키지

⚠️ **주의**: 첫 실행 시 1-2분 정도 소요될 수 있습니다.

## 🔧 문제 해결

### Windows Defender 경고
- 첫 실행 시 Windows Defender 경고가 나타날 수 있습니다
- "추가 정보" → "실행" 클릭

### Python 서버 시작 실패
1. Python이 올바르게 설치되었는지 확인
2. 방화벽에서 포트 5555 허용
3. 다른 프로그램이 포트 5555를 사용 중인지 확인

### 세션 파일 위치
- Windows: `%APPDATA%\Telegram Multi Chat Manager\sessions`
- 세션 파일은 암호화되어 저장됩니다

## 🔐 보안 설정
- API 키와 프록시 정보는 암호화되어 저장
- 하드웨어 ID 기반 암호화 사용
- 세션 파일은 사용자별로 격리

## 📱 사용 방법
1. 앱 실행 후 로그인
2. Telegram API 설정 추가
3. 전화번호로 연결
4. 그룹 선택 후 메시지 전송

## 🔄 업데이트
- 자동 업데이트 기능 내장
- 새 버전 알림 시 자동 다운로드
- 재시작하여 업데이트 적용

## ❓ 지원
문제 발생 시 다음 정보와 함께 문의:
- Windows 버전
- Python 버전
- 오류 메시지 스크린샷
- `%APPDATA%\Telegram Multi Chat Manager\logs` 폴더의 로그 파일