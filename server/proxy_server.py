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
app.config['JSON_AS_ASCII'] = False  # 한글 JSON 지원
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
    '+821039040988': {'api_id': 24304512, 'api_hash': '0ca82ad2de71545de2f9846e3a0192da'},
    '+821084095699': {'api_id': 24530799, 'api_hash': '097062bc50fc6c063dde63ace30acbf1'},  # 8번 화력
    '+821083554890': {'api_id': 29965481, 'api_hash': 'afeb4612d720ab8d2b211baa0ca3475f'},   # 9번 화력
    '+821080670664': {'api_id': 26633894, 'api_hash': '5b01cdef060589ef2e299c463ec3f9a7'},   # 새 계정
    '+821077871056': {'api_id': 26187602, 'api_hash': 'dd558e882d2719eac3481f13743562e4'}    # 11번 계정
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
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821077893897': {
        'proxy_id': 'proxy2',
        'addr': '206.206.81.128',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821057334084': {
        'proxy_id': 'proxy3',
        'addr': '206.206.81.103',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821080406011': {
        'proxy_id': 'proxy4',
        'addr': '206.206.81.47',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821082019001': {
        'proxy_id': 'proxy5',
        'addr': '206.206.81.50',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821039622144': {
        'proxy_id': 'proxy6',
        'addr': '88.209.253.67',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821081724416': {
        'proxy_id': 'proxy7',
        'addr': '88.209.253.53',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821039040988': {
        'proxy_id': 'proxy8',
        'addr': '88.209.253.159',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821084095699': {
        'proxy_id': 'proxy9',
        'addr': '88.209.253.106',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821083554890': {
        'proxy_id': 'proxy10',
        'addr': '88.209.253.52',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821080670664': {
        'proxy_id': 'proxy8_alt',
        'addr': '88.209.253.106',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    },
    '+821077871056': {
        'proxy_id': 'proxy11',
        'addr': '88.209.253.67',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2'
    }
}

# 기존 프록시 정보 (기존 계정용)
PROXIES = {
    'proxy9': {
        'addr': '88.209.253.106',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2',
        'accounts': []
    },
    'proxy10': {
        'addr': '88.209.253.52',
        'port': 12324,
        'username': '14a939d12d002',
        'password': 'e300685af2',
        'accounts': []
    }
}

# 전역 클라이언트 관리 (프록시별로 관리)
clients = {}
phone_code_hashes = {}

def get_proxy_for_phone(phone):
    """전화번호에 할당된 프록시 찾기 (1:1 매칭) - 개선된 에러 처리"""
    try:
        print(f"[PROXY] Looking for proxy for phone: {phone}")
        
        # 신규 API 계정의 경우 고정 매칭
        if phone in PROXY_ACCOUNT_MAPPING:
            proxy_info = PROXY_ACCOUNT_MAPPING[phone]
            print(f"[PROXY] Found dedicated proxy for {phone}: {proxy_info['proxy_id']}")
            return proxy_info['proxy_id'], proxy_info
        
        # 기존 계정의 경우 PROXIES에서 할당 확인
        for proxy_id, proxy_info in PROXIES.items():
            if phone in proxy_info['accounts']:
                print(f"[PROXY] Found existing proxy assignment for {phone}: {proxy_id}")
                return proxy_id, proxy_info
        
        # 새로 할당 (가장 적게 사용된 프록시 선택)
        if not PROXIES:
            print(f"[PROXY] ERROR: No proxies available in PROXIES pool")
            return None, None
            
        min_accounts = float('inf')
        selected_proxy_id = None
        
        for proxy_id, proxy_info in PROXIES.items():
            account_count = len(proxy_info['accounts'])
            print(f"[PROXY] Proxy {proxy_id}: {account_count} accounts")
            if account_count < min_accounts:
                min_accounts = account_count
                selected_proxy_id = proxy_id
        
        if selected_proxy_id:
            PROXIES[selected_proxy_id]['accounts'].append(phone)
            print(f"[PROXY] Assigned new proxy {selected_proxy_id} to {phone}")
            return selected_proxy_id, PROXIES[selected_proxy_id]
        
        print(f"[PROXY] ERROR: Failed to allocate proxy for {phone}")
        return None, None
        
    except Exception as e:
        print(f"[PROXY] ERROR: Exception in get_proxy_for_phone for {phone}: {str(e)}")
        import traceback
        print(f"[PROXY] Traceback: {traceback.format_exc()}")
        return None, None

def handle_locked_session(phone):
    """잠긴 세션 파일 처리 및 복구"""
    import sqlite3
    import shutil
    import time
    
    phone_clean = phone.replace('+', '').replace(' ', '')
    original_session = os.path.join(SESSIONS_DIR, f'{phone_clean}.session')
    
    print(f"[SESSION] Handling potentially locked session for {phone}")
    
    # 1. 기존 세션 파일 잠금 상태 확인
    try:
        # 빠른 읽기 전용 테스트
        conn = sqlite3.connect(original_session, timeout=0.5)
        conn.execute('SELECT COUNT(*) FROM sqlite_master')
        conn.close()
        print(f"[SESSION] Original session file is accessible: {original_session}")
        return original_session
    except (sqlite3.OperationalError, sqlite3.DatabaseError) as e:
        if 'locked' in str(e).lower():
            print(f"[SESSION] Session file is locked, attempting recovery...")
        else:
            print(f"[SESSION] Session file error: {str(e)}")
    except Exception as e:
        print(f"[SESSION] Unexpected error: {str(e)}")
    
    # 2. 복구 시도: 백업 파일 확인
    backup_session = original_session + '.backup'
    if os.path.exists(backup_session):
        print(f"[SESSION] Found backup session, attempting to restore...")
        try:
            # 백업에서 복구
            recovered_session = os.path.join(SESSIONS_DIR, f'{phone_clean}_recovered.session')
            shutil.copy2(backup_session, recovered_session)
            
            # 복구된 파일 테스트
            conn = sqlite3.connect(recovered_session, timeout=1)
            conn.execute('SELECT COUNT(*) FROM sqlite_master')
            conn.close()
            
            print(f"[SESSION] Successfully recovered session: {recovered_session}")
            return recovered_session
        except Exception as recovery_error:
            print(f"[SESSION] Recovery failed: {str(recovery_error)}")
    
    # 3. 최후 수단: 새 세션 생성 (하지만 고정된 이름 사용)
    fixed_session = os.path.join(SESSIONS_DIR, f'{phone_clean}_fixed.session')
    print(f"[SESSION] Creating fixed session path: {fixed_session}")
    
    # 기존 fixed 세션이 있다면 재사용
    if os.path.exists(fixed_session):
        try:
            conn = sqlite3.connect(fixed_session, timeout=1)
            conn.execute('SELECT COUNT(*) FROM sqlite_master')
            conn.close()
            print(f"[SESSION] Reusing existing fixed session: {fixed_session}")
            return fixed_session
        except:
            print(f"[SESSION] Fixed session also locked, will create new one")
    
    return fixed_session

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
    print(f"[CONNECT] Received request: {data}")
    
    phone = data.get('phone')
    print(f"[CONNECT] Phone: {phone}")
    
    if not phone:
        print(f"[CONNECT] ERROR: No phone number provided")
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    # 프록시 할당
    proxy_id, proxy_info = get_proxy_for_phone(phone)
    print(f"[CONNECT] Proxy ID: {proxy_id}, Proxy Info: {proxy_info}")
    
    if not proxy_info:
        print(f"[CONNECT] WARNING: No proxy available for {phone}, using direct connection")
        # 프록시가 없어도 직접 연결로 진행
        proxy_info = {'addr': 'direct', 'port': None}
    
    # 잠금 문제가 있는 계정들의 스마트 세션 처리
    if phone in ['+821080670664', '+821077871056']:
        session_path = handle_locked_session(phone)
    else:
        session_path = os.path.join(SESSIONS_DIR, phone.replace('+', '').replace(' ', ''))
    print(f"[CONNECT] Session path: {session_path}")
    
    try:
        loop = get_or_create_loop()
        
        # 기존 클라이언트가 있으면 연결 해제 후 재생성 (다중 계정 지원)
        if phone in clients:
            try:
                if clients[phone].is_connected():
                    loop.run_until_complete(clients[phone].disconnect())
                print(f"[CONNECT] Disconnected existing client for {phone}")
            except Exception as disconnect_error:
                print(f"[CONNECT] Error disconnecting client for {phone}: {str(disconnect_error)}")
            del clients[phone]
            print(f"[CONNECT] Removed client cache for {phone}")
        
        # 새 클라이언트 생성
        # 해당 전화번호의 API 설정 가져오기
        if phone in API_CONFIGS:
            api_id = API_CONFIGS[phone]['api_id']
            api_hash = API_CONFIGS[phone]['api_hash']
        else:
            api_id = DEFAULT_API_ID
            api_hash = DEFAULT_API_HASH
        
        # 일관된 연결 전략: 모든 계정에 동일한 로직 적용
        session_exists = os.path.exists(session_path + '.session')
        use_proxy = proxy_info['addr'] != 'direct' and session_exists
        
        # 세션이 없는 새 계정이거나 프록시가 없는 경우 직접 연결
        if not session_exists or proxy_info['addr'] == 'direct':
            print(f"[CONNECT] Using direct connection for {phone} (new account or no proxy)")
            clients[phone] = TelegramClient(
                session_path, 
                api_id, 
                api_hash,
                timeout=10  # 10초 타임아웃 추가
            )
        else:
            # 기존 세션이 있고 프록시가 사용 가능한 계정들은 프록시 사용
            proxy = (socks.SOCKS5, proxy_info['addr'], proxy_info['port'], 
                    True, proxy_info['username'], proxy_info['password'])
            print(f"[CONNECT] Using proxy connection for existing account {phone} via {proxy_info['addr']}")
            clients[phone] = TelegramClient(
                session_path, 
                api_id, 
                api_hash,
                proxy=proxy,
                timeout=10  # 10초 타임아웃 추가
            )
        
        async def send_code():
            print(f"[SEND_CODE] Connecting to Telegram...")
            await clients[phone].connect()
            print(f"[SEND_CODE] Connected successfully")
            
            print(f"[SEND_CODE] Checking authorization status...")
            if await clients[phone].is_user_authorized():
                print(f"[SEND_CODE] User already authorized")
                user = await clients[phone].get_me()
                print(f"[SEND_CODE] User: {user.first_name} ({user.phone})")
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
            
            print(f"[SEND_CODE] Sending SMS code request to {phone}...")
            try:
                result = await clients[phone].send_code_request(phone)
                print(f"[SEND_CODE] SMS code request successful! Hash: {result.phone_code_hash[:20]}...")
                proxy_desc = f'프록시: {proxy_info["addr"]}' if proxy_info['addr'] != 'direct' else '직접 연결'
                return {
                    'success': True, 
                    'message': f'인증 코드가 {phone}로 전송되었습니다', 
                    'require_code': True, 
                    'proxy_info': proxy_desc,
                    'hash': result.phone_code_hash
                }
            except Exception as sms_error:
                print(f"[SEND_CODE] ERROR: SMS request failed for {phone}: {str(sms_error)}")
                print(f"[SEND_CODE] Error type: {type(sms_error).__name__}")
                return {
                    'success': False,
                    'error': f'SMS 코드 요청 실패: {str(sms_error)}',
                    'error_type': type(sms_error).__name__,
                    'phone': phone,
                    'proxy_info': f'프록시: {proxy_info["addr"]}' if proxy_info['addr'] != 'direct' else '직접 연결'
                }
        
        result = loop.run_until_complete(send_code())
        print(f"[CONNECT] Result: {result}")
        
        if 'hash' in result:
            phone_code_hashes[phone] = result['hash']
            del result['hash']
        return jsonify(result)
        
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)
        print(f"[CONNECT] ERROR: {error_message}")
        print(f"[CONNECT] Error type: {error_type}")
        import traceback
        print(f"[CONNECT] Traceback: {traceback.format_exc()}")
        
        # 에러 유형별 구체적인 메시지 제공
        user_message = f"연결 실패: {error_message}"
        if "PhoneNumberInvalidError" in error_type:
            user_message = "유효하지 않은 전화번호입니다"
        elif "FloodWaitError" in error_type:
            user_message = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요"
        elif "ConnectionError" in error_type or "ProxyError" in error_type:
            user_message = f"네트워크 연결 오류 (프록시: {proxy_info.get('addr', 'unknown')})"
        
        return jsonify({
            'success': False, 
            'error': user_message,
            'error_type': error_type,
            'phone': phone,
            'proxy_info': f'프록시: {proxy_info.get("addr", "unknown")}' if proxy_info else '프록시 없음'
        }), 500

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
            
            print(f"[GET_GROUPS] Starting group fetch for {phone}")
            
            print(f"[GET_GROUPS] Starting fresh group fetch for {phone}")
            
            # 🔥 완전 새로고침: 캐시 무시하고 서버에서 최신 데이터 가져오기
            try:
                # 모든 대화목록을 강제로 다시 가져오기 (캐시 무시)
                all_dialogs = await clients[phone].get_dialogs(limit=None)
                print(f"[GET_GROUPS] Fetched {len(all_dialogs)} total dialogs from server")
            except Exception as dialog_error:
                print(f"[GET_GROUPS] Error fetching fresh dialogs: {str(dialog_error)}")
                # 기존 방식으로 폴백
                all_dialogs = [d async for d in clients[phone].iter_dialogs()]
            
            groups = []
            valid_groups = 0
            invalid_groups = 0
            
            for dialog in all_dialogs:
                if dialog.is_group or dialog.is_channel:
                    try:
                        # 🔍 실제 가입 상태 확인 (중요!)
                        # 그룹에 실제로 접근 가능한지 테스트
                        entity = await clients[phone].get_entity(dialog.id)
                        
                        # 실제로 메시지를 1개 가져올 수 있는지 테스트 (가입 상태 확인)
                        can_access = False
                        try:
                            async for message in clients[phone].iter_messages(entity, limit=1):
                                can_access = True
                                break
                            # 메시지가 없어도 접근 가능하면 OK
                            if not can_access:
                                can_access = True
                        except Exception as access_error:
                            print(f"[GET_GROUPS] Cannot access group {dialog.id}: {str(access_error)}")
                            invalid_groups += 1
                            continue
                        
                        # 제목 가져오기
                        real_title = getattr(entity, 'title', None)
                        
                        # 🚫 undefined/null 문자열 완전 차단
                        if real_title in ['undefined', 'null', '', None]:
                            print(f"[GET_GROUPS] Invalid title for {dialog.id}, attempting recovery...")
                            # 한 번 더 시도
                            try:
                                fresh_entity = await clients[phone].get_entity(dialog.id)
                                real_title = getattr(fresh_entity, 'title', None)
                                if real_title in ['undefined', 'null', '', None]:
                                    real_title = f'그룹_{dialog.id}'
                                    print(f"[GET_GROUPS] Using fallback title for {dialog.id}")
                            except:
                                real_title = f'그룹_{dialog.id}'
                        
                        final_title = real_title
                    
                        # ✅ 유효한 그룹만 추가
                        group_data = {
                            'id': dialog.id,
                            'title': final_title,
                            'is_channel': dialog.is_channel,
                            'is_group': dialog.is_group
                        }
                        
                        groups.append(group_data)
                        valid_groups += 1
                        print(f"[GET_GROUPS] ✅ Valid group: {dialog.id} -> '{final_title}'")
                        
                    except Exception as entity_error:
                        print(f"[GET_GROUPS] ❌ Skipping inaccessible group {dialog.id}: {str(entity_error)}")
                        invalid_groups += 1
                        # 접근 불가능한 그룹은 아예 제외
                        continue
            
            print(f"[GET_GROUPS] ✅ Successfully fetched {valid_groups} valid groups, skipped {invalid_groups} invalid groups for {phone}")
            
            return {
                'success': True,
                'groups': groups,
                'count': len(groups),
                'valid_count': valid_groups,
                'invalid_count': invalid_groups
            }
        
        return jsonify(loop.run_until_complete(fetch()))
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/send-message', methods=['POST'])
def send_message():
    global clients
    
    try:
        # UTF-8 인코딩 처리
        if request.is_json:
            data = request.get_json(force=True)
        else:
            # 원시 데이터를 UTF-8로 디코딩 시도
            raw_data = request.get_data(as_text=True)
            import json
            data = json.loads(raw_data)
    except Exception as encoding_error:
        print(f"[SEND_MESSAGE] JSON 파싱 오류: {str(encoding_error)}")
        return jsonify({'success': False, 'error': f'JSON 파싱 오류: {str(encoding_error)}'}), 400
    
    print(f"[SEND_MESSAGE] Received request: {data}")
    
    phone = data.get('phone')
    group_ids = data.get('group_ids', [])
    message = data.get('message')
    
    print(f"[SEND_MESSAGE] Phone: {phone}")
    print(f"[SEND_MESSAGE] Group IDs: {group_ids}")
    print(f"[SEND_MESSAGE] Message: {message}")
    
    if not all([phone, group_ids, message]):
        print(f"[SEND_MESSAGE] ERROR: Missing required information")
        print(f"[SEND_MESSAGE] Phone present: {bool(phone)}")
        print(f"[SEND_MESSAGE] Group IDs present: {bool(group_ids)}")
        print(f"[SEND_MESSAGE] Message present: {bool(message)}")
        return jsonify({'success': False, 'error': '필수 정보가 누락되었습니다'}), 400
    
    if not isinstance(group_ids, list):
        group_ids = [group_ids]
    
    print(f"[SEND_MESSAGE] Available clients: {list(clients.keys())}")
    
    if phone not in clients:
        print(f"[SEND_MESSAGE] ERROR: Phone {phone} not in clients")
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

@app.route('/api/get-logged-accounts', methods=['GET'])
def get_logged_accounts():
    """현재 로그인된 계정 목록 반환"""
    global clients
    
    logged_accounts = []
    
    for phone, client in clients.items():
        try:
            # 비동기 함수를 동기적으로 실행
            loop = get_or_create_loop()
            
            async def check_account():
                try:
                    if not client.is_connected():
                        await client.connect()
                    
                    if await client.is_user_authorized():
                        user = await client.get_me()
                        return {
                            'phone': phone,
                            'user': {
                                'id': user.id,
                                'username': user.username,
                                'first_name': user.first_name,
                                'phone': user.phone
                            },
                            'status': 'logged_in'
                        }
                except Exception as e:
                    return {
                        'phone': phone,
                        'status': 'error',
                        'error': str(e)
                    }
                return None
            
            account_info = loop.run_until_complete(check_account())
            if account_info:
                logged_accounts.append(account_info)
                
        except Exception as e:
            logged_accounts.append({
                'phone': phone,
                'status': 'error',
                'error': str(e)
            })
    
    return jsonify({
        'success': True,
        'accounts': logged_accounts,
        'count': len(logged_accounts)
    })

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

def auto_load_sessions():
    """서버 시작 시 기존 세션 파일들을 자동으로 로드"""
    global clients
    
    print("\n=== Auto-loading existing sessions ===")
    
    if not os.path.exists(SESSIONS_DIR):
        print("No sessions directory found")
        return
    
    # 세션 파일들 찾기
    session_files = [f for f in os.listdir(SESSIONS_DIR) if f.endswith('.session')]
    print(f"Found {len(session_files)} session files")
    
    for session_file in session_files:
        try:
            # 파일명에서 전화번호 추출
            phone_number = '+' + session_file.replace('.session', '')
            
            # 잠긴 계정 파일들 건너뛰기 (스마트 세션 처리 대상)
            if phone_number in ['+821080670664', '+821077871056']:
                print(f"⚠️ Skipping locked session for {phone_number} (smart session handling)")
                continue
            
            # API 설정 찾기
            if phone_number in API_CONFIGS:
                api_id = API_CONFIGS[phone_number]['api_id']
                api_hash = API_CONFIGS[phone_number]['api_hash']
            else:
                api_id = DEFAULT_API_ID
                api_hash = DEFAULT_API_HASH
            
            # 프록시 찾기
            proxy_id, proxy_info = get_proxy_for_phone(phone_number)
            
            session_path = os.path.join(SESSIONS_DIR, session_file.replace('.session', ''))
            
            # 클라이언트 생성 (기존 세션은 모두 프록시 사용)
            if proxy_info:
                proxy = (socks.SOCKS5, proxy_info['addr'], proxy_info['port'], 
                        True, proxy_info['username'], proxy_info['password'])
                clients[phone_number] = TelegramClient(session_path, api_id, api_hash, proxy=proxy)
                print(f"[OK] Loaded session for {phone_number} with proxy {proxy_info['addr']}")
            else:
                clients[phone_number] = TelegramClient(session_path, api_id, api_hash)
                print(f"[OK] Loaded session for {phone_number} with direct connection")
            
        except Exception as e:
            print(f"[ERROR] Failed to load {session_file}: {str(e)}")
    
    print(f"Auto-loaded {len(clients)} sessions")
    print("=======================================\n")

def graceful_shutdown():
    """서버 종료 시 세션 정리"""
    print("\n[SHUTDOWN] Cleaning up sessions...")
    
    for phone, client in clients.items():
        try:
            if client.is_connected():
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(client.disconnect())
                print(f"[SHUTDOWN] Disconnected {phone}")
        except Exception as e:
            print(f"[SHUTDOWN] Error disconnecting {phone}: {str(e)}")
    
    print("[SHUTDOWN] Session cleanup completed")

if __name__ == '__main__':
    import signal
    import atexit
    
    # 종료 시 정리 함수 등록
    atexit.register(graceful_shutdown)
    signal.signal(signal.SIGTERM, lambda signum, frame: graceful_shutdown())
    
    print("=" * 50)
    print("Telegram API Server - Proxy Version")
    print("http://localhost:5000")
    print("=" * 50)
    print("프록시 서버 10개 설정 완료!")
    print("각 프록시는 자동으로 계정에 할당됩니다.")
    print("=" * 50)
    
    # 기존 세션 자동 로드
    auto_load_sessions()
    
    try:
        app.run(debug=True, port=5000, threaded=False)
    except KeyboardInterrupt:
        print("\n[SERVER] Received interrupt signal")
        graceful_shutdown()