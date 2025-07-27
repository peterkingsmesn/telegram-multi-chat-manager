import asyncio
import sys
sys.path.append('server')
from proxy_server import *

async def check_real_sms():
    phone = '+821039655066'
    
    print("=== 실제 SMS 수신 여부 확인 ===")
    print(f"전화번호: {phone}")
    
    try:
        from telethon import TelegramClient
        from telethon.errors import *
        import socks
        
        # API 설정
        api_id = API_CONFIGS[phone]['api_id']
        api_hash = API_CONFIGS[phone]['api_hash']
        
        # 프록시 설정
        proxy_id, proxy_info = get_proxy_for_phone(phone)
        session_path = f'server/sessions/{phone.replace("+", "").replace(" ", "")}'
        
        # 기존 세션 삭제해서 완전히 새로 시작
        import os
        if os.path.exists(session_path + '.session'):
            print("기존 세션 파일 삭제 중...")
            os.remove(session_path + '.session')
        
        # 클라이언트 생성 (직접 연결로 테스트)
        print("직접 연결로 테스트 중...")
        client = TelegramClient(session_path, api_id, api_hash)
        
        await client.connect()
        print("텔레그램 연결 완료")
        
        # SMS 코드 요청
        print("SMS 코드 요청 중...")
        result = await client.send_code_request(phone)
        
        print(f"텔레그램 응답: {result}")
        print(f"코드 타입: {result.type}")
        print(f"해시: {result.phone_code_hash}")
        
        # 코드 타입 확인
        if hasattr(result.type, '__class__'):
            type_name = result.type.__class__.__name__
            print(f"응답 타입: {type_name}")
            
            if type_name == 'SentCodeTypeSms':
                print("✅ SMS로 코드 전송됨 - 휴대폰 확인하세요!")
            elif type_name == 'SentCodeTypeApp':
                print("❌ 텔레그램 앱으로 코드 전송됨 (SMS 아님)")
            elif type_name == 'SentCodeTypeCall':
                print("📞 전화 통화로 코드 전송됨")
            else:
                print(f"❓ 알 수 없는 타입: {type_name}")
        
        await client.disconnect()
        
    except FloodWaitError as e:
        print(f"❌ FloodWait 오류: {str(e)}")
    except PhoneNumberInvalidError:
        print("❌ 유효하지 않은 전화번호")
    except Exception as e:
        print(f"❌ 오류 발생: {type(e).__name__}: {str(e)}")

if __name__ == '__main__':
    asyncio.run(check_real_sms())