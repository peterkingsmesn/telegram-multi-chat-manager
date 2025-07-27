import asyncio
import os
import sys
sys.path.append('server')
from proxy_server import *

async def compare_accounts():
    # 실제로 작동하는 계정과 안되는 계정 비교
    working_account = '+821039655066'  # 이전에 성공했던 계정
    not_working_accounts = ['+821083554890', '+821084095699']  # FloodWait 걸린 계정들
    
    print("=== 작동하는 계정 vs 안되는 계정 비교 ===\n")
    
    for phone in [working_account] + not_working_accounts:
        print(f"📱 계정: {phone}")
        
        # 1. API 설정 비교
        if phone in API_CONFIGS:
            api_config = API_CONFIGS[phone]
            print(f"  API ID: {api_config['api_id']}")
            print(f"  API Hash: {api_config['api_hash'][:15]}...")
        
        # 2. 프록시 설정 비교
        proxy_id, proxy_info = get_proxy_for_phone(phone)
        if proxy_info:
            print(f"  프록시: {proxy_info['addr']}:{proxy_info['port']}")
            print(f"  프록시 ID: {proxy_info['proxy_id']}")
        
        # 3. 세션 파일 상태 비교
        session_path = f'server/sessions/{phone.replace("+", "").replace(" ", "")}'
        session_exists = os.path.exists(session_path + ".session")
        print(f"  세션 파일: {session_exists}")
        
        if session_exists:
            # 세션 파일 크기와 수정 시간 확인
            session_file = session_path + ".session"
            stat = os.stat(session_file)
            print(f"  세션 크기: {stat.st_size} bytes")
            print(f"  마지막 수정: {stat.st_mtime}")
        
        # 4. 실제 연결 테스트
        try:
            from telethon import TelegramClient
            from telethon.errors import FloodWaitError
            import socks
            
            if proxy_info and proxy_info.get('addr') != 'direct':
                proxy = (socks.SOCKS5, proxy_info['addr'], proxy_info['port'], 
                        True, proxy_info['username'], proxy_info['password'])
                client = TelegramClient(session_path, api_config['api_id'], api_config['api_hash'], proxy=proxy)
            else:
                client = TelegramClient(session_path, api_config['api_id'], api_config['api_hash'])
            
            await client.connect()
            
            if await client.is_user_authorized():
                user = await client.get_me()
                print(f"  인증 상태: 로그인됨 ({user.first_name})")
            else:
                print(f"  인증 상태: 로그아웃")
                
                # SMS 코드 요청 테스트
                try:
                    result = await client.send_code_request(phone)
                    print(f"  SMS 요청: 성공 - {result.type}")
                except FloodWaitError as e:
                    wait_time = str(e).split('wait of ')[1].split(' seconds')[0]
                    hours = int(wait_time) // 3600
                    print(f"  SMS 요청: FloodWait {hours}시간 대기")
                except Exception as e:
                    print(f"  SMS 요청: 실패 - {type(e).__name__}: {str(e)}")
            
            await client.disconnect()
            
        except Exception as e:
            print(f"  연결 테스트: 실패 - {str(e)}")
        
        print("-" * 50)

if __name__ == '__main__':
    asyncio.run(compare_accounts())