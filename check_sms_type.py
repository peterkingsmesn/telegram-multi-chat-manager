import asyncio
import sys
sys.path.append('server')
from proxy_server import *
from telethon import TelegramClient
from telethon.errors import FloodWaitError, PhoneNumberInvalidError
import socks

async def check_sms_type():
    phone = '+821039655066'
    
    print("=== SMS 타입 상세 확인 ===")
    print(f"전화번호: {phone}")
    
    try:
        # API 설정
        api_id = API_CONFIGS[phone]['api_id']
        api_hash = API_CONFIGS[phone]['api_hash']
        
        # 프록시 설정
        proxy_id, proxy_info = get_proxy_for_phone(phone)
        session_path = f'server/sessions/{phone.replace("+", "").replace(" ", "")}'
        
        # 프록시로 연결
        proxy = (socks.SOCKS5, proxy_info['addr'], proxy_info['port'], 
                True, proxy_info['username'], proxy_info['password'])
        client = TelegramClient(session_path, api_id, api_hash, proxy=proxy)
        
        await client.connect()
        print("텔레그램 연결 완료")
        
        # 현재 인증 상태 확인
        if await client.is_user_authorized():
            user = await client.get_me()
            print(f"현재 로그인 상태: {user.first_name} ({user.phone})")
            
            # 로그아웃해서 SMS 테스트
            print("로그아웃 후 SMS 테스트...")
            await client.log_out()
            print("로그아웃 완료")
        
        # SMS 코드 요청
        print("SMS 코드 요청 중...")
        result = await client.send_code_request(phone)
        
        print(f"텔레그램 응답: {result}")
        print(f"코드 타입: {result.type}")
        
        # 상세 타입 확인
        type_name = result.type.__class__.__name__
        print(f"정확한 타입: {type_name}")
        
        if type_name == 'SentCodeTypeSms':
            print("✅ SMS로 코드 전송 - 휴대폰에 문자 와야 함!")
            if hasattr(result.type, 'length'):
                print(f"코드 길이: {result.type.length}자리")
        elif type_name == 'SentCodeTypeApp':
            print("❌ 텔레그램 앱으로 전송 - SMS 아님")
        elif type_name == 'SentCodeTypeCall':
            print("📞 음성 통화로 전송")
        
        await client.disconnect()
        
    except FloodWaitError as e:
        print(f"❌ FloodWait: {str(e)}")
    except Exception as e:
        print(f"❌ 오류: {type(e).__name__}: {str(e)}")

if __name__ == '__main__':
    asyncio.run(check_sms_type())