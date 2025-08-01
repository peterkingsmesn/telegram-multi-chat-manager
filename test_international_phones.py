#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
국제 전화번호 정규화 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'server'))

from proxy_server import normalize_phone

def test_normalize_phone():
    """다양한 국가의 전화번호 정규화 테스트"""
    
    test_cases = [
        # 한국
        ("010-1234-5678", "+821012345678"),
        ("82-10-1234-5678", "+821012345678"),
        ("82 10 1234 5678", "+821012345678"),
        ("+821012345678", "+821012345678"),
        
        # 미국/캐나다
        ("1234567890", "+1234567890"),
        ("+1234567890", "+1234567890"),
        ("(123) 456-7890", "+1234567890"),
        ("123-456-7890", "+1234567890"),
        
        # 중국
        ("8613012345678", "+8613012345678"),
        ("+8613012345678", "+8613012345678"),
        ("130 1234 5678", "+13012345678"),
        
        # 일본
        ("819012345678", "+819012345678"),
        ("+819012345678", "+819012345678"),
        ("90-1234-5678", "+9012345678"),
        
        # 영국
        ("447123456789", "+447123456789"),
        ("+447123456789", "+447123456789"),
        ("07123 456789", "+07123456789"),
        
        # 독일
        ("4917123456789", "+4917123456789"),
        ("+4917123456789", "+4917123456789"),
        ("0171 2345 6789", "+017123456789"),
        
        # 특수 케이스
        ("", ""),
        (None, None),
        ("+123", "+123"),
        ("123", "+123"),
    ]
    
    print("=== 국제 전화번호 정규화 테스트 ===")
    print(f"{'입력':<20} {'예상':<20} {'결과':<20} {'상태'}")
    print("-" * 80)
    
    passed = 0
    failed = 0
    
    for input_phone, expected in test_cases:
        try:
            result = normalize_phone(input_phone)
            status = "PASS" if result == expected else "FAIL"
            
            if result == expected:
                passed += 1
            else:
                failed += 1
                
            print(f"{str(input_phone or 'None'):<20} {str(expected or 'None'):<20} {str(result or 'None'):<20} {status}")
            
        except Exception as e:
            failed += 1
            print(f"{str(input_phone or 'None'):<20} {str(expected or 'None'):<20} {'ERROR':<20} FAIL: {str(e)}")
    
    print("-" * 80)
    print(f"총 테스트: {passed + failed}, 성공: {passed}, 실패: {failed}")
    
    if failed == 0:
        print("모든 테스트 통과!")
    else:
        print(f"{failed}개 테스트 실패")
    
    return failed == 0

if __name__ == "__main__":
    success = test_normalize_phone()
    exit(0 if success else 1)