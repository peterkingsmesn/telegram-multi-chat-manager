import asyncio
import sys
sys.path.append('server')
from proxy_server import *
from telethon import TelegramClient
from telethon.errors import FloodWaitError
import socks

async def verify_real_sms():
    print("=== 실제 SMS 수신 여부 검증 ===")
    
    # 11번 계정으로 테스트 (방금 만든 API)
    phone = '+821077871056'
    api_id = API_CONFIGS[phone]['api_id']
    api_hash = API_CONFIGS[phone]['api_hash']
    
    print(f"전화번호: {phone}")
    print(f"API ID: {api_id}")
    print(f"API Hash: {api_hash}")
    
    # 완전히 새로운 세션으로 테스트
    import time
    temp_session = f'temp_test_{int(time.time())}'
    
    try:
        # 직접 연결 (프록시 없이)
        print("\n1. 직접 연결로 테스트...")
        client = TelegramClient(temp_session, api_id, api_hash)
        
        await client.connect()
        print("✓ 텔레그램 연결 성공")
        
        # SMS 코드 요청
        print("2. SMS 코드 요청 중...")
        result = await client.send_code_request(phone)
        
        print(f"✓ 텔레그램 응답 받음")
        print(f"응답 타입: {type(result.type).__name__}")
        print(f"전체 응답: {result}")
        
        # 타입별 분석
        if hasattr(result.type, '__class__'):
            type_name = result.type.__class__.__name__
            if type_name == 'SentCodeTypeSms':
                print("🎯 SMS로 전송됨 - 휴대폰에 문자가 와야 합니다!")
                if hasattr(result.type, 'length'):
                    print(f"코드 길이: {result.type.length}자리")
            elif type_name == 'SentCodeTypeApp':
                print("⚠️ 텔레그램 앱으로 전송 - SMS가 아닙니다")
            elif type_name == 'SentCodeTypeCall':
                print("📞 음성통화로 전송")
            else:
                print(f"❓ 알 수 없는 타입: {type_name}")
        
        await client.disconnect()
        
        # 임시 세션 파일 삭제
        import os
        temp_files = [f'{temp_session}.session']
        for f in temp_files:
            if os.path.exists(f):
                os.remove(f)
                print(f"임시 파일 삭제: {f}")
        
    except FloodWaitError as e:
        print(f"❌ FloodWait 오류: {str(e)}")
    except Exception as e:
        print(f"❌ 오류 발생: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == '__main__':
    asyncio.run(verify_real_sms())