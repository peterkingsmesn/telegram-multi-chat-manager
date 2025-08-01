#!/usr/bin/env python3
"""
실시간 코드 감시 및 검증 시스템
다른 Claude의 코딩 작업을 실시간으로 감시하고 API 흐름, 개연성, 표준 함수 호출 패턴을 검증
"""

import os
import sys
import json
import time
import threading
import ast
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, asdict
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import requests
import asyncio
import sqlite3

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('code_monitor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('CodeMonitor')

@dataclass
class ValidationIssue:
    """검증 이슈를 나타내는 데이터 클래스"""
    type: str  # 'api_flow', 'function_call', 'consistency', 'security'
    severity: str  # 'critical', 'high', 'medium', 'low'
    file_path: str
    line_number: int
    message: str
    suggestion: str
    timestamp: datetime
    
    def to_dict(self):
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class APIEndpoint:
    """API 엔드포인트 정보"""
    path: str
    method: str
    function_name: str
    line_number: int
    parameters: List[str]
    
@dataclass
class APICall:
    """클라이언트 API 호출 정보"""
    endpoint: str
    method: str
    file_path: str
    line_number: int
    function_context: str

class TelegramAPIValidator:
    """텔레그램 API 특화 검증기"""
    
    def __init__(self):
        # 정상적인 API 흐름 패턴
        self.valid_flows = [
            ['connect', 'verify', 'get-groups', 'send-message'],
            ['connect', 'get-groups', 'send-message'],  # 이미 인증된 경우
            ['test-connection', 'get-groups'],
            ['get-logged-accounts'],
            ['proxy-status'],
            ['test-telegram-app']  # 새로 추가된 테스트 엔드포인트
        ]
        
        # 필수 함수 호출 패턴
        self.required_patterns = {
            'connect': ['TelegramClient', 'connect', 'is_user_authorized'],
            'verify': ['sign_in', 'get_me'],
            'send-message': ['send_message', 'is_connected'],
            'get-groups': ['iter_dialogs']
        }
        
        # 보안 체크 패턴
        self.security_patterns = {
            'api_exposure': [r'api_id\s*=\s*\d+', r'api_hash\s*=\s*[\'"][a-f0-9]+[\'"]'],
            'phone_exposure': [r'\+82\d{10,11}'],
            'session_safety': [r'\.session[\'"]?\s*\)', r'session.*\.remove\(']
        }

    def validate_api_flow(self, calls: List[APICall]) -> List[ValidationIssue]:
        """API 호출 순서의 논리적 일관성 검증"""
        issues = []
        
        # 호출 순서 추출
        call_sequence = [call.endpoint.split('/')[-1] for call in calls]
        
        # 유효한 흐름과 비교
        is_valid_flow = any(
            self._is_subsequence(flow, call_sequence) 
            for flow in self.valid_flows
        )
        
        if not is_valid_flow and len(call_sequence) > 1:
            issues.append(ValidationIssue(
                type='api_flow',
                severity='high',
                file_path=calls[0].file_path if calls else 'unknown',
                line_number=calls[0].line_number if calls else 0,
                message=f'비정상적인 API 호출 순서: {" → ".join(call_sequence)}',
                suggestion='정상 흐름: connect → verify → get-groups → send-message',
                timestamp=datetime.now()
            ))
        
        return issues
    
    def _is_subsequence(self, pattern: List[str], sequence: List[str]) -> bool:
        """패턴이 시퀀스의 부분 순서인지 확인"""
        i = 0
        for item in sequence:
            if i < len(pattern) and item == pattern[i]:
                i += 1
        return i == len(pattern)

    def validate_function_calls(self, file_content: str, file_path: str) -> List[ValidationIssue]:
        """표준 함수 호출 패턴 검증"""
        issues = []
        lines = file_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # TelegramClient 사용 패턴 체크
            if 'TelegramClient(' in line:
                if 'await' not in lines[max(0, i-2):i+2]:
                    issues.append(ValidationIssue(
                        type='function_call',
                        severity='medium',
                        file_path=file_path,
                        line_number=i,
                        message='TelegramClient 비동기 처리 누락 가능성',
                        suggestion='TelegramClient 메서드들은 await와 함께 사용해야 합니다',
                        timestamp=datetime.now()
                    ))
            
            # 에러 처리 패턴 체크
            if 'except Exception as e:' in line:
                next_lines = lines[i:i+3]
                if not any('log' in nl or 'print' in nl for nl in next_lines):
                    issues.append(ValidationIssue(
                        type='function_call',
                        severity='low',
                        file_path=file_path,
                        line_number=i,
                        message='예외 처리에서 로깅 누락',
                        suggestion='예외 발생 시 적절한 로깅을 추가하세요',
                        timestamp=datetime.now()
                    ))
        
        return issues

    def validate_security(self, file_content: str, file_path: str) -> List[ValidationIssue]:
        """보안 관련 검증"""
        issues = []
        lines = file_content.split('\n')
        
        for category, patterns in self.security_patterns.items():
            for pattern in patterns:
                for i, line in enumerate(lines, 1):
                    if re.search(pattern, line):
                        if category == 'api_exposure':
                            issues.append(ValidationIssue(
                                type='security',
                                severity='high',
                                file_path=file_path,
                                line_number=i,
                                message='API 키/해시 하드코딩 감지',
                                suggestion='API 키는 환경변수나 별도 설정 파일로 관리하세요',
                                timestamp=datetime.now()
                            ))
        
        return issues

class CodeAnalyzer:
    """코드 정적 분석기"""
    
    def __init__(self):
        self.api_validator = TelegramAPIValidator()
    
    def analyze_python_file(self, file_path: str) -> List[ValidationIssue]:
        """Python 파일 분석"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # AST 파싱
            tree = ast.parse(content)
            
            # API 엔드포인트 추출
            endpoints = self._extract_flask_routes(tree, file_path)
            
            # 함수 호출 패턴 검증
            issues.extend(self.api_validator.validate_function_calls(content, file_path))
            
            # 보안 검증
            issues.extend(self.api_validator.validate_security(content, file_path))
            
        except Exception as e:
            logger.error(f"Python 파일 분석 실패 {file_path}: {e}")
            issues.append(ValidationIssue(
                type='consistency',
                severity='medium',
                file_path=file_path,
                line_number=0,
                message=f'파일 분석 실패: {str(e)}',
                suggestion='파일 구문을 확인하세요',
                timestamp=datetime.now()
            ))
        
        return issues
    
    def analyze_javascript_file(self, file_path: str) -> List[ValidationIssue]:
        """JavaScript 파일 분석"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # API 호출 패턴 추출
            api_calls = self._extract_api_calls(content, file_path)
            
            # API 흐름 검증
            issues.extend(self.api_validator.validate_api_flow(api_calls))
            
            # fetch 사용 패턴 검증
            issues.extend(self._validate_fetch_patterns(content, file_path))
            
        except Exception as e:
            logger.error(f"JavaScript 파일 분석 실패 {file_path}: {e}")
        
        return issues
    
    def _extract_flask_routes(self, tree: ast.AST, file_path: str) -> List[APIEndpoint]:
        """Flask 라우트 추출"""
        endpoints = []
        
        class RouteVisitor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                # @app.route 데코레이터 찾기
                for decorator in node.decorator_list:
                    if (isinstance(decorator, ast.Call) and 
                        isinstance(decorator.func, ast.Attribute) and
                        decorator.func.attr == 'route'):
                        
                        if decorator.args:
                            route_path = decorator.args[0].s if hasattr(decorator.args[0], 's') else 'unknown'
                            method = 'GET'  # 기본값
                            
                            # methods 찾기
                            for keyword in decorator.keywords:
                                if keyword.arg == 'methods' and hasattr(keyword.value, 'elts'):
                                    method = keyword.value.elts[0].s if keyword.value.elts else 'GET'
                            
                            endpoints.append(APIEndpoint(
                                path=route_path,
                                method=method,
                                function_name=node.name,
                                line_number=node.lineno,
                                parameters=[arg.arg for arg in node.args.args]
                            ))
                
                self.generic_visit(node)
        
        RouteVisitor().visit(tree)
        return endpoints
    
    def _extract_api_calls(self, content: str, file_path: str) -> List[APICall]:
        """JavaScript에서 API 호출 추출"""
        calls = []
        lines = content.split('\n')
        
        fetch_pattern = r'fetch\s*\(\s*[\'"`]([^\'"`]+)[\'"`]'
        
        for i, line in enumerate(lines, 1):
            matches = re.finditer(fetch_pattern, line)
            for match in matches:
                url = match.group(1)
                # API 엔드포인트 추출
                if '/api/' in url:
                    endpoint = url.split('/api/')[-1]
                    calls.append(APICall(
                        endpoint=endpoint,
                        method='POST',  # 대부분 POST
                        file_path=file_path,
                        line_number=i,
                        function_context=self._get_function_context(lines, i)
                    ))
        
        return calls
    
    def _get_function_context(self, lines: List[str], line_num: int) -> str:
        """함수 컨텍스트 추출"""
        for i in range(line_num - 1, -1, -1):
            line = lines[i].strip()
            if line.startswith('function ') or line.startswith('async function '):
                return line.split('(')[0].replace('function ', '').replace('async ', '')
        return 'unknown'
    
    def _validate_fetch_patterns(self, content: str, file_path: str) -> List[ValidationIssue]:
        """fetch 사용 패턴 검증"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            if 'fetch(' in line:
                # 에러 처리 확인
                if not any('catch' in lines[j] for j in range(i, min(i+5, len(lines)))):
                    issues.append(ValidationIssue(
                        type='function_call',
                        severity='medium',
                        file_path=file_path,
                        line_number=i,
                        message='fetch 호출에 에러 처리 누락',
                        suggestion='fetch 호출에는 .catch() 또는 try-catch를 사용하세요',
                        timestamp=datetime.now()
                    ))
        
        return issues

class FileWatcher(FileSystemEventHandler):
    """파일 변경 감시"""
    
    def __init__(self, monitor: 'CodeMonitor'):
        self.monitor = monitor
        self.debounce_time = 1.0  # 1초 디바운스
        self.last_modified = {}
    
    def on_modified(self, event):
        if event.is_directory:
            return
        
        file_path = event.src_path
        current_time = time.time()
        
        # 디바운스 처리
        if (file_path in self.last_modified and 
            current_time - self.last_modified[file_path] < self.debounce_time):
            return
        
        self.last_modified[file_path] = current_time
        
        # 관심 있는 파일만 처리
        if file_path.endswith(('.py', '.js', '.html')):
            logger.info(f"파일 변경 감지: {file_path}")
            self.monitor.analyze_file(file_path)

class ReportGenerator:
    """보고서 생성기"""
    
    def __init__(self, output_dir: str = "monitoring_reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def generate_real_time_report(self, issues: List[ValidationIssue]) -> str:
        """실시간 보고서 생성"""
        if not issues:
            return "✅ 검증 완료: 문제 없음"
        
        report = []
        report.append("🚨 코드 검증 이슈 발견")
        report.append("=" * 50)
        
        # 심각도별 그룹화
        by_severity = {}
        for issue in issues:
            by_severity.setdefault(issue.severity, []).append(issue)
        
        for severity in ['critical', 'high', 'medium', 'low']:
            if severity in by_severity:
                report.append(f"\n📊 {severity.upper()} ({len(by_severity[severity])}개)")
                report.append("-" * 30)
                
                for issue in by_severity[severity]:
                    report.append(f"📁 {issue.file_path}:{issue.line_number}")
                    report.append(f"❗ {issue.message}")
                    report.append(f"💡 {issue.suggestion}")
                    report.append("")
        
        return "\n".join(report)
    
    def save_detailed_report(self, issues: List[ValidationIssue]):
        """상세 보고서 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.output_dir / f"validation_report_{timestamp}.json"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump([issue.to_dict() for issue in issues], f, 
                     ensure_ascii=False, indent=2)
        
        logger.info(f"상세 보고서 저장: {report_file}")

class CodeMonitor:
    """메인 모니터링 시스템"""
    
    def __init__(self, watch_directory: str = "."):
        self.watch_dir = Path(watch_directory)
        self.analyzer = CodeAnalyzer()
        self.reporter = ReportGenerator()
        self.observer = Observer()
        self.issues_db = []
        
        # 실시간 알림 콜백
        self.alert_callbacks = []
    
    def start_monitoring(self):
        """모니터링 시작"""
        logger.info(f"코드 모니터링 시작: {self.watch_dir}")
        
        # 초기 전체 스캔
        self.full_scan()
        
        # 파일 감시 시작
        event_handler = FileWatcher(self)
        self.observer.schedule(event_handler, str(self.watch_dir), recursive=True)
        self.observer.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop_monitoring()
    
    def stop_monitoring(self):
        """모니터링 중지"""
        logger.info("모니터링 중지")
        self.observer.stop()
        self.observer.join()
    
    def full_scan(self):
        """전체 파일 스캔"""
        logger.info("전체 파일 스캔 시작")
        
        python_files = list(self.watch_dir.rglob("*.py"))
        js_files = list(self.watch_dir.rglob("*.js"))
        
        all_issues = []
        
        for file_path in python_files + js_files:
            issues = self.analyze_file(str(file_path))
            all_issues.extend(issues)
        
        if all_issues:
            report = self.reporter.generate_real_time_report(all_issues)
            logger.warning(f"\n{report}")
            self.reporter.save_detailed_report(all_issues)
        else:
            logger.info("✅ 전체 스캔 완료: 문제 없음")
    
    def analyze_file(self, file_path: str) -> List[ValidationIssue]:
        """단일 파일 분석"""
        issues = []
        
        if file_path.endswith('.py'):
            issues = self.analyzer.analyze_python_file(file_path)
        elif file_path.endswith('.js'):
            issues = self.analyzer.analyze_javascript_file(file_path)
        
        if issues:
            # 실시간 알림
            report = self.reporter.generate_real_time_report(issues)
            logger.warning(f"파일 검증 실패 {file_path}:\n{report}")
            
            # 콜백 호출
            for callback in self.alert_callbacks:
                callback(file_path, issues)
        
        return issues
    
    def add_alert_callback(self, callback):
        """실시간 알림 콜백 추가"""
        self.alert_callbacks.append(callback)

def main():
    """메인 실행 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description='실시간 코드 감시 및 검증 시스템')
    parser.add_argument('--directory', '-d', default='.', 
                       help='감시할 디렉토리 (기본: 현재 디렉토리)')
    parser.add_argument('--scan-only', action='store_true',
                       help='한 번만 스캔하고 종료')
    
    args = parser.parse_args()
    
    monitor = CodeMonitor(args.directory)
    
    if args.scan_only:
        monitor.full_scan()
    else:
        # 실시간 알림 콜백 예시
        def alert_callback(file_path: str, issues: List[ValidationIssue]):
            print(f"🚨 ALERT: {file_path}에서 {len(issues)}개 이슈 발견!")
        
        monitor.add_alert_callback(alert_callback)
        monitor.start_monitoring()

if __name__ == "__main__":
    main()