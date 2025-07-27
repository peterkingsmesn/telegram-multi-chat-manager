import asyncio
import sys
import os
sys.path.append('server')
from proxy_server import *

async def fix_10th_account():
    phone = '+821080670664'
    print(f"=== 10번 계정 수정: {phone} ===")
    
    # 1. 기본 정보 확인
    session_path = f'server/sessions/{phone.replace("+", "").replace(" ", "")}'
    print(f"세션 경로: {session_path}")
    print(f"세션 파일 존재: {os.path.exists(session_path + '.session')}")
    
    # 2. API 설정 확인
    if phone in API_CONFIGS:
        api_id = API_CONFIGS[phone]['api_id']
        api_hash = API_CONFIGS[phone]['api_hash']
        print(f"API ID: {api_id}")
    else:
        print("❌ API 설정이 없습니다")
        return
    
    # 3. 프록시 설정 확인
    proxy_id, proxy_info = get_proxy_for_phone(phone)
    print(f"프록시 정보: {proxy_info}")
    
    try:
        from telethon import TelegramClient
        import socks
        
        # 4. 직접 연결로 테스트 (프록시 없이)
        print("\n--- 직접 연결 테스트 ---")
        client_direct = TelegramClient(session_path + '_temp', api_id, api_hash)
        
        await client_direct.connect()
        print("직접 연결 성공")
        
        if await client_direct.is_user_authorized():
            user = await client_direct.get_me()
            print(f"이미 인증됨: {user.first_name}")
        else:
            print("인증 필요")
        
        await client_direct.disconnect()
        
        # 임시 파일 삭제
        temp_files = [session_path + '_temp.session']
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        # 5. 프록시 연결 테스트
        if proxy_info and proxy_info.get('addr') != 'direct':
            print("\n--- 프록시 연결 테스트 ---")
            proxy = (socks.SOCKS5, proxy_info['addr'], proxy_info['port'], 
                    True, proxy_info['username'], proxy_info['password'])
            
            client_proxy = TelegramClient(session_path + '_proxy_temp', api_id, api_hash, proxy=proxy)
            
            await client_proxy.connect()
            print("프록시 연결 성공")
            
            if await client_proxy.is_user_authorized():
                user = await client_proxy.get_me()
                print(f"프록시로 인증됨: {user.first_name}")
            else:
                print("프록시로 인증 필요")
            
            await client_proxy.disconnect()
            
            # 임시 파일 삭제
            temp_files = [session_path + '_proxy_temp.session']
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
        
        print("\n✅ 10번 계정 테스트 완료")
        
    except Exception as e:
        print(f"❌ 오류 발생: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == '__main__':
    asyncio.run(fix_10th_account())