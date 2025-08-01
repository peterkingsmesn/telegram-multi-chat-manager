#!/usr/bin/env python3
"""
코드 모니터 실행 스크립트
백그라운드에서 실시간 감시를 수행
"""

import os
import sys
import threading
import time
from code_monitor import CodeMonitor, ValidationIssue
from typing import List

class MonitoringDashboard:
    """실시간 모니터링 대시보드"""
    
    def __init__(self):
        self.monitor = CodeMonitor(".")
        self.issue_count = 0
        self.last_issues = []
        
    def start_dashboard(self):
        """대시보드 시작"""
        print("🚀 텔레그램 코드 감시 시스템 시작")
        print("=" * 60)
        print("📁 감시 디렉토리:", os.getcwd())
        print("🔍 감시 파일 유형: .py, .js")
        print("=" * 60)
        
        # 실시간 알림 콜백 등록
        self.monitor.add_alert_callback(self.on_issue_detected)
        
        # 백그라운드에서 모니터링 시작
        monitor_thread = threading.Thread(
            target=self.monitor.start_monitoring,
            daemon=True
        )
        monitor_thread.start()
        
        # 대시보드 루프
        self.dashboard_loop()
    
    def on_issue_detected(self, file_path: str, issues: List[ValidationIssue]):
        """이슈 감지 시 호출되는 콜백"""
        self.issue_count += len(issues)
        self.last_issues = issues
        
        # 심각한 이슈는 즉시 알림
        critical_issues = [i for i in issues if i.severity in ['critical', 'high']]
        if critical_issues:
            print(f"\n🚨 CRITICAL ALERT: {file_path}")
            for issue in critical_issues:
                print(f"   ❗ {issue.message}")
                print(f"   💡 {issue.suggestion}")
            print()
    
    def dashboard_loop(self):
        """대시보드 메인 루프"""
        try:
            while True:
                # 상태 업데이트 (5초마다)
                time.sleep(5)
                self.print_status()
                
        except KeyboardInterrupt:
            print("\n🛑 모니터링 중지")
            self.monitor.stop_monitoring()
    
    def print_status(self):
        """현재 상태 출력"""
        current_time = time.strftime("%H:%M:%S")
        print(f"\r⏰ {current_time} | 총 이슈: {self.issue_count} | 상태: 감시중...", end="", flush=True)

def main():
    """메인 실행"""
    try:
        dashboard = MonitoringDashboard()
        dashboard.start_dashboard()
    except Exception as e:
        print(f"❌ 모니터링 시스템 오류: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()