import asyncio
import os
import sys
sys.path.append('server')
from proxy_server import *

async def test_sms_for_phone(phone):
    print(f'\n=== SMS 테스트: {phone} ===')
    
    # API 설정 확인
    if phone not in API_CONFIGS:
        print('ERROR: API 설정 없음')
        return False
    
    api_id = API_CONFIGS[phone]['api_id']
    api_hash = API_CONFIGS[phone]['api_hash']
    print(f'API ID: {api_id}')
    
    # 프록시 설정 확인
    proxy_id, proxy_info = get_proxy_for_phone(phone)
    
    # 세션 파일 확인
    session_path = f'server/sessions/{phone.replace("+", "").replace(" ", "")}'
    session_exists = os.path.exists(session_path + ".session")
    print(f'Session exists: {session_exists}')
    
    try:
        from telethon import TelegramClient
        from telethon.errors import FloodWaitError
        import socks
        
        if proxy_info and proxy_info.get('addr') != 'direct':
            proxy = (socks.SOCKS5, proxy_info['addr'], proxy_info['port'], 
                    True, proxy_info['username'], proxy_info['password'])
            client = TelegramClient(session_path, api_id, api_hash, proxy=proxy)
            print(f'프록시: {proxy_info["addr"]}')
        else:
            client = TelegramClient(session_path, api_id, api_hash)
            print('직접 연결')
        
        await client.connect()
        
        # 인증 상태 확인
        if await client.is_user_authorized():
            user = await client.get_me()
            print(f'이미 로그인됨: {user.first_name}')
            await client.disconnect()
            return False
        else:
            print('SMS 코드 요청 중...')
            result = await client.send_code_request(phone)
            print(f'결과: {result.type}')
            
            # SMS 타입 확인
            if hasattr(result.type, 'length'):
                if 'App' in str(type(result.type)):
                    print('❌ 텔레그램 앱으로 코드 전송 (SMS 아님)')
                    await client.disconnect()
                    return False
                else:
                    print(f'✅ SMS 코드 전송! 길이: {result.type.length}')
                    await client.disconnect()
                    return True
        
        await client.disconnect()
        return False
        
    except FloodWaitError as e:
        wait_seconds = str(e).split('wait of ')[1].split(' seconds')[0]
        hours = int(wait_seconds) // 3600
        print(f'❌ FloodWait: {hours}시간 대기')
        return False
    except Exception as e:
        print(f'❌ ERROR: {type(e).__name__}: {str(e)}')
        return False

async def find_sms_account():
    phones = [
        '+821077893897', '+821057334084', '+821080406011', 
        '+821082019001', '+821039622144', '+821081724416', 
        '+821039040988'
    ]
    
    print('SMS 수신 가능한 계정 찾는 중...')
    
    for phone in phones:
        success = await test_sms_for_phone(phone)
        if success:
            print(f'\n🎯 SMS 수신 가능한 계정 발견: {phone}')
            return phone
        
        # 잠시 대기
        await asyncio.sleep(2)
    
    print('\n❌ SMS 수신 가능한 계정을 찾지 못했습니다')
    return None

if __name__ == '__main__':
    asyncio.run(find_sms_account())