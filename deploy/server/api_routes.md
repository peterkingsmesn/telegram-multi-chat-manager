# API 라우트 정리

## 중복된 엔드포인트 (두 서버 모두에 있음)
- `/health` - 서버 상태 확인
- `/api/connect` - 텔레그램 연결
- `/api/verify` - 인증 코드 확인
- `/api/groups` - 그룹 목록 조회
- `/api/send/message` - 메시지 전송
- `/api/send/images` - 이미지 전송
- `/api/disconnect` - 연결 해제

## telegram_server.py에만 있는 엔드포인트
- `/api/config/status` - 설정 상태 확인
- `/api/config/add` - API 설정 추가
- `/api/sessions` - 세션 목록
- `/api/sessions/cleanup` - 세션 정리
- `/api/accounts/auto-setup` - 자동 설정 전화번호
- `/api/accounts/critical` - 중요 계정 목록
- `/api/send-message` - send/message의 alias
- `/api/get-logged-accounts` - 로그인된 계정 목록
- `/api/get-groups` - groups의 alias
- `/api/test-connection` - 연결 테스트
- `/api/verify-password` - 2단계 인증
- `/api/proxy-status` - 프록시 상태
- `/api/get-api-configs` - API 설정 목록
- `/api/save-api-config` - API 설정 저장
- `/api/register-user-api` - API 등록
- `/api/delete-user-api` - API 삭제
- `/api/get-registered-apis` - 등록된 API 목록
- `/api/app-auth-request` - 앱 인증 요청

## proxy_server.py에만 있는 엔드포인트
- `/config` - 설정 반환 (민감한 정보 제외)

## api_register.py (Blueprint)
- `/api/register/start` - API 등록 시작
- `/api/register/verify` - API 등록 인증
- `/api/register/cancel` - API 등록 취소
- `/api/accounts/list` - 계정 목록
- `/api/accounts/remove` - 계정 제거

## 권장사항
1. proxy_server.py는 프록시 관련 기능만 남기고 나머지는 telegram_server.py로 통합
2. 중복된 엔드포인트는 telegram_server.py에만 남기기
3. proxy_server.py는 프록시 전용 서버로 분리