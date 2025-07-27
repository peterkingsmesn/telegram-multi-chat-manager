import asyncio
import sys
sys.path.append('server')
from proxy_server import *
from telethon import TelegramClient
from telethon.tl.functions.auth import SendCodeRequest, ResendCodeRequest

async def force_sms_test():
    phone = '+821077871056'
    api_id = 26187602
    api_hash = 'dd558e882d2719eac3481f13743562e4'
    
    print(f'강제 SMS 요청 테스트: {phone}')
    
    try:
        client = TelegramClient('force_sms_test', api_id, api_hash)
        await client.connect()
        
        # 1차: 일반 코드 요청
        print('1. 일반 SMS 코드 요청...')
        result1 = await client.send_code_request(phone)
        print(f'1차 결과: {result1.type.__class__.__name__}')
        
        # 2차: 강제 재전송 요청 (SMS 강제)
        if hasattr(result1, 'phone_code_hash'):
            print('2. SMS 강제 재전송 요청...')
            try:
                # ResendCode로 SMS 강제 요청
                resend_result = await client(ResendCodeRequest(
                    phone_number=phone,
                    phone_code_hash=result1.phone_code_hash
                ))
                print(f'재전송 결과: {resend_result.type.__class__.__name__}')
            except Exception as resend_error:
                print(f'재전송 오류: {str(resend_error)}')
        
        await client.disconnect()
        
        import os
        if os.path.exists('force_sms_test.session'):
            os.remove('force_sms_test.session')
            
    except Exception as e:
        print(f'오류: {str(e)}')

asyncio.run(force_sms_test())