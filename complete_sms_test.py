import asyncio
import sys
import time
import os
sys.path.append('server')

from telethon import TelegramClient
from telethon.tl.functions.auth import SendCodeRequest, ResendCodeRequest, LogOutRequest
from telethon.tl.types import CodeTypeCall, CodeTypeSms
from telethon.errors import FloodWaitError, PhoneCodeInvalidError
from proxy_server import API_CONFIGS

async def complete_sms_test():
    """완전한 SMS 배송 테스트 - 실제 휴대폰으로 SMS가 배송되는지 확인"""
    
    print("=== 실제 SMS 배송 완전 검증 테스트 ===")
    print("목적: API 성공 응답과 실제 SMS 수신 간의 차이 확인\n")
    
    # 테스트할 계정들
    test_accounts = [
        '+821080670664',  # 10번 계정 (기존)
        '+821077871056'   # 11번 계정 (새로운 API)
    ]
    
    for phone in test_accounts:
        if phone not in API_CONFIGS:
            print(f"❌ {phone}: API 설정이 없습니다\n")
            continue
            
        api_id = API_CONFIGS[phone]['api_id']
        api_hash = API_CONFIGS[phone]['api_hash']
        
        print(f"📱 테스트 계정: {phone}")
        print(f"API ID: {api_id}")
        print(f"API Hash: {api_hash[:10]}...")
        print("-" * 50)
        
        # 임시 세션으로 완전히 새로운 연결
        temp_session = f'sms_test_{phone.replace("+", "").replace(" ", "")}_{int(time.time())}'
        
        try:
            # 1단계: 기존 세션 완전 제거
            print("1. 기존 세션 완전 정리...")
            session_files = [
                f'server/sessions/{phone.replace("+", "").replace(" ", "")}.session',
                f'{temp_session}.session'
            ]
            
            for session_file in session_files:
                if os.path.exists(session_file):
                    try:
                        os.remove(session_file)
                        print(f"   삭제됨: {session_file}")
                    except:
                        pass
            
            # 2단계: 완전히 새로운 클라이언트로 연결
            print("2. 새로운 클라이언트 연결...")
            client = TelegramClient(temp_session, api_id, api_hash)
            
            await client.connect()
            print("   ✓ 텔레그램 서버 연결 성공")
            
            # 3단계: 명시적으로 로그아웃 상태 확인
            print("3. 로그아웃 상태 확인...")
            try:
                await client(LogOutRequest())
                print("   ✓ 기존 세션 로그아웃 완료")
            except:
                print("   ✓ 이미 로그아웃 상태")
            
            await client.disconnect()
            
            # 4단계: 새로운 연결로 SMS 요청
            print("4. SMS 코드 요청...")
            client = TelegramClient(temp_session, api_id, api_hash)
            await client.connect()
            
            # SMS 강제 요청
            result = await client.send_code_request(
                phone, 
                force_sms=True  # SMS 강제 요청
            )
            
            print("   ✓ 텔레그램 API 요청 성공")
            print(f"   응답 타입: {type(result.type).__name__}")
            
            # 응답 분석
            if hasattr(result.type, '__class__'):
                type_name = result.type.__class__.__name__
                if type_name == 'SentCodeTypeSms':
                    print("   🎯 SMS로 전송됨!")
                    if hasattr(result.type, 'length'):
                        print(f"   📏 코드 길이: {result.type.length}자리")
                    print("   📲 지금 휴대폰을 확인해보세요!")
                elif type_name == 'SentCodeTypeApp':
                    print("   ⚠️ 텔레그램 앱으로 전송")
                    print("   📱 SMS가 아닌 앱 알림입니다")
                elif type_name == 'SentCodeTypeCall':
                    print("   📞 음성통화로 전송")
                else:
                    print(f"   ❓ 알 수 없는 타입: {type_name}")
            
            # 5단계: 재전송 시도 (SMS 강제)
            if hasattr(result, 'phone_code_hash'):
                print("5. SMS 재전송 시도...")
                try:
                    resend_result = await client(ResendCodeRequest(
                        phone_number=phone,
                        phone_code_hash=result.phone_code_hash
                    ))
                    print(f"   재전송 타입: {type(resend_result.type).__name__}")
                except Exception as resend_error:
                    print(f"   재전송 실패: {str(resend_error)}")
            
            await client.disconnect()
            
            # 임시 파일 정리
            if os.path.exists(f'{temp_session}.session'):
                os.remove(f'{temp_session}.session')
            
            print("✅ 테스트 완료")
            print("=" * 60)
            print("🔍 실제 휴대폰 확인:")
            print("   1. SMS 문자가 왔는지 확인")
            print("   2. 만약 SMS가 안 왔다면 '서버 성공 vs 실제 미수신' 문제 확인됨")
            print("=" * 60)
            
            # 다음 계정 테스트 전 대기
            if phone != test_accounts[-1]:
                print("다음 계정 테스트까지 5초 대기...\n")
                await asyncio.sleep(5)
            
        except FloodWaitError as e:
            print(f"   ❌ FloodWait 오류: {str(e)}")
            print(f"   ⏰ {e.seconds}초 후 재시도 가능")
        except Exception as e:
            print(f"   ❌ 오류: {type(e).__name__}: {str(e)}")
            import traceback
            print("   상세 오류:")
            print("   " + "\n   ".join(traceback.format_exc().split("\n")))
        
        print("\n")

if __name__ == '__main__':
    asyncio.run(complete_sms_test())