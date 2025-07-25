# 텔레그램 API 자동화 도구

19개 전화번호에 대한 텔레그램 API 자동 생성 도구

## 기능

- 19개 전화번호 일괄 처리
- SMS 코드 수동 입력 GUI
- 자동 API 정보 추출
- 결과 JSON/CSV 저장
- 진행 상황 실시간 모니터링

## 설치

```bash
pip install -r requirements.txt
```

Chrome 드라이버 필요 (자동 다운로드됨)

## 사용법

1. 스크립트 실행
```bash
python telegram_api_automation.py
```

2. 전화번호 19개 입력 (한 줄에 하나씩)
3. "번호 로드" 클릭
4. "시작" 클릭
5. SMS 코드가 오면 GUI에 입력
6. 완료 후 "결과 저장"

## 주의사항

- 텔레그램 계정당 하루 5개 제한 있을 수 있음
- SMS 코드는 2분 내 입력 필요
- VPN 사용 시 문제 발생 가능