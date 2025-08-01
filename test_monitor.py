#!/usr/bin/env python3
"""
코드 모니터 테스트 스크립트
시스템이 올바르게 작동하는지 검증
"""

import tempfile
import os
from code_monitor import CodeMonitor, TelegramAPIValidator

def test_api_flow_validation():
    """API 흐름 검증 테스트"""
    print("API 흐름 검증 테스트...")
    
    validator = TelegramAPIValidator()
    
    # 잘못된 흐름 테스트
    from code_monitor import APICall
    bad_calls = [
        APICall("send-message", "POST", "test.js", 1, "sendMessage"),
        APICall("connect", "POST", "test.js", 2, "connect")  # 순서가 잘못됨
    ]
    
    issues = validator.validate_api_flow(bad_calls)
    
    if issues:
        print("잘못된 API 흐름 감지 성공")
        for issue in issues:
            print(f"   - {issue.message}")
    else:
        print("잘못된 API 흐름 감지 실패")

def test_security_validation():
    """보안 검증 테스트"""
    print("\n보안 검증 테스트...")
    
    validator = TelegramAPIValidator()
    
    # 보안 문제가 있는 코드
    insecure_code = """
api_id = 12345678
api_hash = 'abcd1234567890abcd1234567890abcd'
phone = '+821234567890'
"""
    
    issues = validator.validate_security(insecure_code, "test.py")
    
    if issues:
        print("보안 문제 감지 성공")
        for issue in issues:
            print(f"   - {issue.message}")
    else:
        print("보안 문제 감지 실패")

def test_function_pattern_validation():
    """함수 패턴 검증 테스트"""
    print("\n함수 패턴 검증 테스트...")
    
    validator = TelegramAPIValidator()
    
    # 잘못된 함수 사용 패턴
    bad_code = """
client = TelegramClient(session, api_id, api_hash)
client.connect()  # await 누락
try:
    result = something()
except Exception as e:
    pass  # 로깅 누락
"""
    
    issues = validator.validate_function_calls(bad_code, "test.py")
    
    if issues:
        print("잘못된 함수 패턴 감지 성공")
        for issue in issues:
            print(f"   - {issue.message}")
    else:
        print("잘못된 함수 패턴 감지 실패")

def test_file_monitoring():
    """파일 모니터링 테스트"""
    print("\n파일 모니터링 테스트...")
    
    # 임시 파일 생성
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write("""
# 문제가 있는 테스트 파일
api_id = 12345678
api_hash = 'test_hash'

def bad_function():
    client = TelegramClient('session', api_id, api_hash)
    client.connect()  # await 누락
""")
        temp_path = f.name
    
    try:
        monitor = CodeMonitor()
        issues = monitor.analyze_file(temp_path)
        
        if issues:
            print("파일 분석 성공")
            print(f"   - 발견된 이슈: {len(issues)}개")
        else:
            print("파일 분석에서 이슈를 찾지 못함")
    
    finally:
        os.unlink(temp_path)

def test_current_project():
    """현재 프로젝트 분석 테스트"""
    print("\n현재 프로젝트 분석 테스트...")
    
    monitor = CodeMonitor(".")
    
    # proxy_server.py 분석
    if os.path.exists("server/proxy_server.py"):
        issues = monitor.analyze_file("server/proxy_server.py")
        print(f"proxy_server.py: {len(issues)}개 이슈")
        
        for issue in issues[:3]:  # 처음 3개만 표시
            print(f"   - {issue.severity}: {issue.message}")
    
    # app.js 분석
    if os.path.exists("app.js"):
        issues = monitor.analyze_file("app.js")
        print(f"app.js: {len(issues)}개 이슈")
        
        for issue in issues[:3]:  # 처음 3개만 표시
            print(f"   - {issue.severity}: {issue.message}")

def main():
    """모든 테스트 실행"""
    print("코드 모니터 시스템 테스트 시작")
    print("=" * 50)
    
    test_api_flow_validation()
    test_security_validation()
    test_function_pattern_validation()
    test_file_monitoring()
    test_current_project()
    
    print("\n" + "=" * 50)
    print("모든 테스트 완료")
    print("\n실제 모니터링 시작: python run_monitor.py")

if __name__ == "__main__":
    main()