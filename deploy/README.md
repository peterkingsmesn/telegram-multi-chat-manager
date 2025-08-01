# 텔레그램 멀티 챗 매니저

텔레그램 멀티 계정 관리 및 그룹 메시지 전송 웹 애플리케이션

## 설치 방법

### 1. 필수 요구사항
- Python 3.7 이상
- Node.js (선택사항, 개발 서버용)
- 텔레그램 API 키 (https://my.telegram.org 에서 발급)

### 2. 설치

1. 의존성 설치:
```bash
cd server
pip install -r requirements.txt
```

2. 설정 파일 생성:
   - `config.json` 파일을 수정하거나
   - `config_example.json`을 참고하여 새로 생성

### 3. 설정

#### API 설정
`config.json` 파일에서 텔레그램 API 정보를 설정합니다:

```json
{
  "telegram": {
    "api_configs": {
      "+821012345678": {
        "api_id": 12345678,
        "api_hash": "your_api_hash_here"
      }
    }
  }
}
```

#### 프록시 설정 (선택사항)
프록시를 사용하는 경우:

```json
{
  "proxies": {
    "proxy_account_mapping": {
      "+821012345678": {
        "proxy_id": "proxy1",
        "addr": "proxy.example.com",
        "port": 12324,
        "username": "username",
        "password": "password"
      }
    }
  }
}
```

## 실행 방법

### 서버 시작
```bash
cd server
python proxy_server.py
```

### 웹 인터페이스 접속
브라우저에서 `index.html` 파일을 열거나 웹 서버로 호스팅

## 주요 기능

1. **계정 관리**
   - 최대 30개의 텔레그램 계정 관리
   - API 키 자동 설정
   - 프록시 지원

2. **그룹 관리**
   - 계정별 그룹 목록 조회
   - 화력별 그룹 구성
   - 자동 그룹 배치

3. **메시지 전송**
   - 텍스트 메시지 전송
   - 이미지/파일 첨부
   - 템플릿 메시지
   - 전체 브로드캐스트

4. **수익인증**
   - 12개 버튼 (용량별)
   - 이미지 중복 방지
   - 일괄 전송

## API 엔드포인트

- `POST /api/connect` - 텔레그램 연결
- `POST /api/verify` - 인증 코드 확인
- `POST /api/get-groups` - 그룹 목록 조회
- `POST /api/send-message` - 메시지 전송
- `POST /api/send-images` - 이미지 전송
- `POST /api/config/update` - 설정 업데이트
- `GET /api/get-logged-accounts` - 로그인된 계정 목록

## 보안 주의사항

1. `config.json` 파일은 민감한 정보를 포함하므로 공유하지 마세요
2. API 키와 전화번호는 안전하게 보관하세요
3. 프록시 정보는 암호화하여 저장하는 것을 권장합니다
4. 세션 파일(`sessions/` 폴더)은 백업하되 공유하지 마세요

## 문제 해결

### 연결 오류
- API 키가 올바른지 확인
- 전화번호 형식 확인 (+국가코드 포함)
- 프록시 설정 확인

### 인증 오류
- SMS 코드를 정확히 입력했는지 확인
- 2단계 인증이 활성화된 경우 비밀번호 입력

### 그룹 목록이 보이지 않음
- 계정이 해당 그룹에 가입되어 있는지 확인
- 그룹 접근 권한 확인

## 라이선스

이 프로젝트는 개인 사용 목적으로 제작되었습니다.
상업적 사용 시 별도 문의 바랍니다.