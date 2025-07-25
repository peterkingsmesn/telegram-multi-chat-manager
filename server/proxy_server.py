from flask import Flask, request, jsonify
from flask_cors import CORS
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, FloodWaitError, PhoneNumberInvalidError
import asyncio
import os
from datetime import datetime
import base64
import nest_asyncio
import socks

# asyncio 중첩 허용
nest_asyncio.apply()

app = Flask(__name__)
CORS(app)  # 모든 CORS 허용

# 텔레그램 API 정보 (계정별 설정)
API_CONFIGS = {
    '+821039655066': {'api_id': 23279359, 'api_hash': '8d4ef99de8f14569cb81900e75399ab3'},
    '+821077893897': {'api_id': 25749043, 'api_hash': '978901ad718929f39b51d810d90b8735'},
    '+821057334084': {'api_id': 27491367, 'api_hash': 'f7298569cdd2de0f88e6408c93cc7b56'},
    '+821080406011': {'api_id': 25927273, 'api_hash': '2b69559b777a8e4e01692e33611b2c40'},
    '+821082019001': {'api_id': 28431661, 'api_hash': '48a8130d04abddb9dbc97026284579a1'},
    '+821039622144': {'api_id': 16490395, 'api_hash': '5d5c26f9dd354c302d0aeb01d95d8c47'},
    '+821081724416': {'api_id': 28909315, 'api_hash': '79013de375d6ea282e951ae48e6c4955'},
    '+821039040988': {'api_id': 24304512, 'api_hash': '0ca82ad2de71545de2f9846e3a0192da'}
}

# 기본 API (기존 계정용)
DEFAULT_API_ID = 26633894
DEFAULT_API_HASH = '5b01cdef060589ef2e299c463ec3f9a7'

# 세션 디렉토리
SESSIONS_DIR = 'sessions'
if not os.path.exists(SESSIONS_DIR):
    os.makedirs(SESSIONS_DIR)

# 프록시-계정 1:1 매칭 설정
PROXY_ACCOUNT_MAPPING = {
    '+821039655066': {
        'proxy_id': 'proxy1',
        'addr': '206.206.81.37',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821077893897': {
        'proxy_id': 'proxy2',
        'addr': '206.206.81.128',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821057334084': {
        'proxy_id': 'proxy3',
        'addr': '206.206.81.103',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821080406011': {
        'proxy_id': 'proxy4',
        'addr': '206.206.81.47',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821082019001': {
        'proxy_id': 'proxy5',
        'addr': '206.206.81.50',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821039622144': {
        'proxy_id': 'proxy6',
        'addr': '88.209.253.67',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821081724416': {
        'proxy_id': 'proxy7',
        'addr': '88.209.253.53',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821039040988': {
        'proxy_id': 'proxy8',
        'addr': '88.209.253.159',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    }
}

# 기존 프록시 정보 (기존 계정용)
PROXIES = {
    'proxy9': {
        'addr': '88.209.253.106',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2',
        'accounts': []
    },
    'proxy10': {
        'addr': '88.209.253.52',
        'port': 12323,
        'username': '14a939d12d002',
        'password': 'e300685af2',
        'accounts': []
    }
}

# 전역 클라이언트 관리 (프록시별로 관리)
clients = {}
phone_code_hashes = {}

def get_proxy_for_phone(phone):
    """전화번호에 할당된 프록시 찾기 (1:1 매칭)"""
    # 신규 API 계정의 경우 고정 매칭
    if phone in PROXY_ACCOUNT_MAPPING:
        proxy_info = PROXY_ACCOUNT_MAPPING[phone]
        return proxy_info['proxy_id'], proxy_info
    
    # 기존 계정의 경우 PROXIES에서 할당
    for proxy_id, proxy_info in PROXIES.items():
        if phone in proxy_info['accounts']:
            return proxy_id, proxy_info
    
    # 새로 할당 (가장 적게 사용된 프록시 선택)
    min_accounts = float('inf')
    selected_proxy_id = None
    
    for proxy_id, proxy_info in PROXIES.items():
        if len(proxy_info['accounts']) < min_accounts:
            min_accounts = len(proxy_info['accounts'])
            selected_proxy_id = proxy_id
    
    if selected_proxy_id:
        PROXIES[selected_proxy_id]['accounts'].append(phone)
        return selected_proxy_id, PROXIES[selected_proxy_id]
    
    return None, None

def get_or_create_loop():
    """현재 스레드의 이벤트 루프를 가져오거나 생성"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop

@app.route('/api/connect', methods=['POST'])
def connect():
    global clients, phone_code_hashes
    
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    # 프록시 할당
    proxy_id, proxy_info = get_proxy_for_phone(phone)
    if not proxy_info:
        return jsonify({'success': False, 'error': '사용 가능한 프록시가 없습니다'}), 500
    
    session_path = os.path.join(SESSIONS_DIR, phone.replace('+', ''))
    
    try:
        loop = get_or_create_loop()
        
        # 기존 클라이언트가 있으면 연결 해제 후 재생성 (다중 계정 지원)
        if phone in clients:
            try:
                if clients[phone].is_connected():
                    loop.run_until_complete(clients[phone].disconnect())
            except:
                pass
            del clients[phone]
        
        # 새 클라이언트 생성
        # 프록시 설정
        proxy = (socks.SOCKS5, proxy_info['addr'], proxy_info['port'], 
                True, proxy_info['username'], proxy_info['password'])
        
        # 해당 전화번호의 API 설정 가져오기
        if phone in API_CONFIGS:
            api_id = API_CONFIGS[phone]['api_id']
            api_hash = API_CONFIGS[phone]['api_hash']
        else:
            api_id = DEFAULT_API_ID
            api_hash = DEFAULT_API_HASH
        
        clients[phone] = TelegramClient(
            session_path, 
            api_id, 
            api_hash,
            proxy=proxy
        )
        
        async def send_code():
            await clients[phone].connect()
            
            if await clients[phone].is_user_authorized():
                user = await clients[phone].get_me()
                return {
                    'success': True,
                    'message': f'계정 {user.first_name}로 이미 로그인되어 있습니다',
                    'already_authorized': True,
                    'proxy_info': f'프록시: {proxy_info["addr"]} (계정별 독립)',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'first_name': user.first_name,
                        'phone': user.phone
                    }
                }
            
            result = await clients[phone].send_code_request(phone)
            return {
                'success': True, 
                'message': f'인증 코드가 {phone}로 전송되었습니다', 
                'require_code': True, 
                'proxy_info': f'프록시: {proxy_info["addr"]} (계정별 독립)',
                'hash': result.phone_code_hash
            }
        
        result = loop.run_until_complete(send_code())
        if 'hash' in result:
            phone_code_hashes[phone] = result['hash']
            del result['hash']
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verify', methods=['POST'])
def verify():
    global clients, phone_code_hashes
    
    data = request.json
    phone = data.get('phone')
    code = data.get('code')
    
    if not phone or not code:
        return jsonify({'success': False, 'error': '전화번호와 인증 코드가 필요합니다'}), 400
    
    if phone not in clients or phone not in phone_code_hashes:
        return jsonify({'success': False, 'error': '먼저 연결을 시도해주세요'}), 400
    
    try:
        loop = get_or_create_loop()
        
        async def sign_in():
            await clients[phone].sign_in(phone, code, phone_code_hash=phone_code_hashes[phone])
            user = await clients[phone].get_me()
            return {
                'success': True,
                'message': '로그인 성공',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'phone': user.phone
                }
            }
        
        result = loop.run_until_complete(sign_in())
        del phone_code_hashes[phone]  # 사용 후 삭제
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    global clients
    
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    if phone not in clients:
        return jsonify({
            'success': True,
            'connected': False,
            'message': '연결된 클라이언트가 없습니다'
        })
    
    try:
        loop = get_or_create_loop()
        
        async def test():
            if not clients[phone].is_connected():
                await clients[phone].connect()
                
            if await clients[phone].is_user_authorized():
                user = await clients[phone].get_me()
                
                # 현재 프록시 정보 찾기
                proxy_info = None
                for pid, pinfo in PROXIES.items():
                    if phone in pinfo['accounts']:
                        proxy_info = pinfo
                        break
                
                return {
                    'success': True,
                    'connected': True,
                    'proxy_info': f'프록시: {proxy_info["addr"]}' if proxy_info else 'Unknown',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'first_name': user.first_name,
                        'phone': user.phone
                    }
                }
            return {'success': True, 'connected': False}
        
        return jsonify(loop.run_until_complete(test()))
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'connected': False}), 500

@app.route('/api/get-groups', methods=['POST'])
def get_groups():
    global clients
    
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 400
    
    try:
        loop = get_or_create_loop()
        
        async def fetch():
            if not clients[phone].is_connected():
                await clients[phone].connect()
            
            if not await clients[phone].is_user_authorized():
                return {'success': False, 'error': '로그인이 필요합니다'}
            
            groups = []
            async for dialog in clients[phone].iter_dialogs():
                if dialog.is_group or dialog.is_channel:
                    # 탈퇴한 그룹 제외 (강화된 필터링)
                    try:
                        entity = dialog.entity
                        
                        # 그룹에서 탈퇴했거나 추방당한 경우 제외
                        if hasattr(entity, 'left') and entity.left:
                            continue
                        if hasattr(entity, 'kicked') and entity.kicked:
                            continue
                            
                        # 참여자가 아닌 경우 제외
                        if hasattr(entity, 'participant') and not entity.participant:
                            continue
                            
                        # 접근 권한이 없는 경우 제외
                        if hasattr(entity, 'access_hash') and not entity.access_hash:
                            continue
                            
                        # 실제로 그룹에 참여 중인지 확인
                        try:
                            participants = await clients[phone].get_participants(entity, limit=1)
                            if not participants:
                                continue
                        except:
                            # 참여자 목록을 가져올 수 없으면 탈퇴한 것으로 간주
                            continue
                            
                    except Exception as e:
                        # 에러가 있는 그룹은 제외
                        print(f"Error checking group {dialog.title}: {e}")
                        continue
                        
                    groups.append({
                        'id': dialog.id,
                        'title': dialog.title,
                        'is_channel': dialog.is_channel,
                        'is_group': dialog.is_group
                    })
            
            return {
                'success': True,
                'groups': groups,
                'count': len(groups)
            }
        
        return jsonify(loop.run_until_complete(fetch()))
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/send-message', methods=['POST'])
def send_message():
    global clients
    
    data = request.json
    phone = data.get('phone')
    group_ids = data.get('group_ids', [])
    message = data.get('message')
    
    if not all([phone, group_ids, message]):
        return jsonify({'success': False, 'error': '필수 정보가 누락되었습니다'}), 400
    
    if not isinstance(group_ids, list):
        group_ids = [group_ids]
    
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 400
    
    try:
        loop = get_or_create_loop()
        
        async def send():
            if not clients[phone].is_connected():
                await clients[phone].connect()
            
            if not await clients[phone].is_user_authorized():
                return {'success': False, 'error': '로그인이 필요합니다'}
            
            results = []
            for group_id in group_ids:
                try:
                    await clients[phone].send_message(int(group_id), message)
                    results.append({'group_id': group_id, 'success': True})
                except Exception as e:
                    results.append({'group_id': group_id, 'success': False, 'error': str(e)})
            
            successful = sum(1 for r in results if r['success'])
            return {
                'success': True,
                'message': f'{successful}/{len(group_ids)}개 그룹에 메시지 전송',
                'results': results
            }
        
        return jsonify(loop.run_until_complete(send()))
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/send-images', methods=['POST'])
def send_images():
    global clients
    
    data = request.json
    phone = data.get('phone')
    group_ids = data.get('group_ids', [])
    message = data.get('message', '')
    images = data.get('images', [])
    
    if not all([phone, group_ids]):
        return jsonify({'success': False, 'error': '필수 정보가 누락되었습니다'}), 400
    
    if not isinstance(group_ids, list):
        group_ids = [group_ids]
    
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 400
    
    try:
        loop = get_or_create_loop()
        
        async def send():
            if not clients[phone].is_connected():
                await clients[phone].connect()
            
            if not await clients[phone].is_user_authorized():
                return {'success': False, 'error': '로그인이 필요합니다'}
            
            import tempfile
            import os
            
            results = []
            temp_files = []
            
            try:
                # Base64 이미지를 임시 파일로 저장
                for idx, image in enumerate(images):
                    image_data = base64.b64decode(image['data'])
                    
                    # 파일 확장자 결정
                    ext = '.jpg'
                    if 'png' in image['type'].lower():
                        ext = '.png'
                    elif 'gif' in image['type'].lower():
                        ext = '.gif'
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                    temp_file.write(image_data)
                    temp_file.close()
                    temp_files.append(temp_file.name)
                
                # 각 그룹에 전송
                for group_id in group_ids:
                    try:
                        # 메시지가 있으면 먼저 텍스트 전송
                        if message:
                            await clients[phone].send_message(int(group_id), message)
                        
                        # 이미지들 전송
                        for temp_file in temp_files:
                            await clients[phone].send_file(int(group_id), temp_file)
                        
                        results.append({'group_id': group_id, 'success': True})
                    except Exception as e:
                        results.append({'group_id': group_id, 'success': False, 'error': str(e)})
                
            finally:
                # 임시 파일 정리
                for temp_file in temp_files:
                    try:
                        os.unlink(temp_file)
                    except:
                        pass
            
            successful = sum(1 for r in results if r['success'])
            return {
                'success': True,
                'message': f'{successful}/{len(group_ids)}개 그룹에 이미지 전송',
                'results': results
            }
        
        return jsonify(loop.run_until_complete(send()))
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/proxy-status', methods=['GET'])
def proxy_status():
    """프록시 상태 확인 API"""
    status = []
    
    # 신규 API 계정 (1:1 매칭)
    for phone, proxy_info in PROXY_ACCOUNT_MAPPING.items():
        status.append({
            'id': proxy_info['proxy_id'],
            'address': proxy_info['addr'],
            'accounts': 1,
            'accounts_list': [phone],
            'account_type': 'New API'
        })
    
    # 기존 계정
    for proxy_id, proxy_info in PROXIES.items():
        status.append({
            'id': proxy_id,
            'address': proxy_info['addr'],
            'accounts': len(proxy_info['accounts']),
            'accounts_list': proxy_info['accounts'],
            'account_type': 'Legacy'
        })
    
    total_accounts = len(PROXY_ACCOUNT_MAPPING) + sum(len(p['accounts']) for p in PROXIES.values())
    
    return jsonify({
        'success': True,
        'proxies': status,
        'total_accounts': total_accounts,
        'new_api_accounts': len(PROXY_ACCOUNT_MAPPING),
        'legacy_accounts': sum(len(p['accounts']) for p in PROXIES.values())
    })

if __name__ == '__main__':
    print("=" * 50)
    print("Telegram API Server - Proxy Version")
    print("http://localhost:5000")
    print("=" * 50)
    print("프록시 서버 10개 설정 완료!")
    print("각 프록시는 자동으로 계정에 할당됩니다.")
    print("=" * 50)
    app.run(debug=True, port=5000, threaded=False)