from flask import Flask, request, jsonify, session
from telethon import TelegramClient
from telethon.errors import (
    SessionPasswordNeededError, FloodWaitError, PhoneNumberInvalidError,
    PhoneCodeInvalidError, UserDeactivatedError, AuthKeyUnregisteredError
)
import asyncio
import os
import base64
import nest_asyncio
import socks
from functools import wraps
from datetime import datetime

# 유틸리티 및 공통 모듈 임포트
from utils import (
    setup_logging, SessionManager, ConfigManager, 
    handle_telegram_error, get_or_create_loop,
    create_telegram_client, get_proxy_for_phone,
    handle_locked_session, validate_client_state,
    validate_phone_number, ensure_client_connected,
    temporary_file, temporary_directory
)
from api_register import api_register_bp
from auth import auth_bp, login_required
from app_factory import create_app, register_blueprints
from decorators import error_handler, async_error_handler, validate_phone_required, client_required

# asyncio 중첩 허용
nest_asyncio.apply()

# 로깅 설정
logger = setup_logging()

# Flask 앱 생성 (앱 팩토리 사용)
app = create_app()
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')  # 세션용 시크릿 키

# 매니저 인스턴스 생성
config_manager = ConfigManager()
session_manager = SessionManager(config_manager.get('telegram.sessions_dir', 'sessions'))

# Blueprint 등록
register_blueprints(app, [api_register_bp, auth_bp])

# 전역 클라이언트 관리
clients = {}
phone_code_hashes = {}

# get_or_create_loop는 utils에서 임포트

def require_config(f):
    """API 설정이 필요한 엔드포인트를 위한 데코레이터"""
    @wraps(f)
    @validate_phone_required  # 전화번호 검증 데코레이터 추가
    def decorated_function(*args, **kwargs):
        data = request.get_json()
        phone = data.get('phone')
        
        api_config = config_manager.get_api_config(phone)
        if not api_config:
            return jsonify({
                'success': False, 
                'error': 'API 설정을 찾을 수 없습니다. 먼저 API를 등록해주세요.',
                'need_config': True
            }), 400
        
        return f(*args, **kwargs)
    return decorated_function

async def create_client(phone, api_config):
    """텔레그램 클라이언트 생성"""
    api_id = api_config.get('api_id')
    api_hash = api_config.get('api_hash')
    session_path = session_manager.get_session_path(phone)
    
    # 프록시 정보 가져오기
    proxy_mapping = config_manager.get('proxies.proxy_account_mapping', {})
    proxy_info = proxy_mapping.get(phone)
    
    # utils의 공통 함수 사용
    return await create_telegram_client(phone, api_id, api_hash, session_path, proxy_info)

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'active_clients': len(clients),
        'config_loaded': bool(config_manager.config)
    })

@app.route('/config', methods=['GET'])
def get_config():
    """현재 설정 반환 (민감한 정보 제외)"""
    config = config_manager.config
    safe_config = {
        'server': config.get('server', {}),
        'telegram': {
            'sessions_dir': config.get('telegram', {}).get('sessions_dir', 'sessions'),
            'api_count': len(config.get('telegram', {}).get('api_configs', {}))
        },
        'proxies': {
            'proxy_count': len(config.get('proxies', {}).get('proxy_pool', {})),
            'mapping_count': len(config.get('proxies', {}).get('proxy_account_mapping', {}))
        }
    }
    return jsonify(safe_config)

@app.route('/api/config/status', methods=['GET'])
def config_status():
    """설정 상태 확인"""
    accounts = config_manager.list_accounts()
    sessions = session_manager.list_sessions()
    
    return jsonify({
        'success': True,
        'accounts': accounts,
        'sessions': sessions,
        'config': {
            'api_count': len(accounts),
            'session_count': len(sessions),
            'sessions_dir': config_manager.get('telegram.sessions_dir')
        }
    })

@app.route('/api/config/add', methods=['POST'])
def add_config():
    """API 및 프록시 설정 추가"""
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    # 전화번호 형식 검증
    if not phone.startswith('+'):
        return jsonify({'success': False, 'error': '전화번호는 +로 시작해야 합니다 (예: +1234567890)'}), 400
    
    try:
        # API 설정 추가
        if 'api_id' in data and 'api_hash' in data:
            config_manager.add_api_config(
                phone,
                data['api_id'],
                data['api_hash']
            )
            logger.info(f"Added API config for {phone}")
        
        # 프록시 설정 추가 (선택사항)
        if 'proxy' in data:
            proxy_data = data['proxy']
            config_manager.add_proxy_config(phone, {
                'proxy_id': proxy_data.get('id', f'proxy_{phone}'),
                'addr': proxy_data.get('addr'),
                'port': proxy_data.get('port', 1080),
                'username': proxy_data.get('username'),
                'password': proxy_data.get('password')
            })
            logger.info(f"Added proxy config for {phone}")
        
        return jsonify({
            'success': True,
            'message': '설정이 추가되었습니다.',
            'phone': phone
        })
        
    except Exception as e:
        logger.error(f"Failed to add config: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/connect', methods=['POST'])
@login_required
@require_config
def connect():
    """텔레그램 연결 및 인증 시작"""
    global clients, phone_code_hashes
    
    data = request.json
    phone = data.get('phone')
    
    try:
        loop = get_or_create_loop()
        
        # 세션 상태 확인
        session_health = session_manager.check_session_health(phone)
        if session_health['exists'] and not session_health['healthy']:
            logger.warning(f"Unhealthy session detected for {phone}, cleaning up...")
            session_manager.clean_session(phone)
            session_manager.backup_session(phone)
        
        # 기존 클라이언트 정리
        if phone in clients:
            try:
                if clients[phone].is_connected():
                    loop.run_until_complete(clients[phone].disconnect())
                logger.info(f"Disconnected existing client for {phone}")
            except Exception as e:
                logger.error(f"Error disconnecting client: {e}")
            del clients[phone]
        
        # API 설정 가져오기
        api_config = config_manager.get_api_config(phone)
        
        async def connect_and_auth():
            # 클라이언트 생성
            client = await create_client(phone, api_config)
            clients[phone] = client
            
            # 연결
            await client.connect()
            logger.info(f"Connected to Telegram for {phone}")
            
            # 인증 상태 확인
            if await client.is_user_authorized():
                user = await client.get_me()
                logger.info(f"Already authorized: {user.first_name} ({phone})")
                return {
                    'success': True,
                    'message': f'이미 로그인되어 있습니다.',
                    'already_authorized': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'phone': user.phone
                    }
                }
            
            # SMS 코드 요청
            logger.info(f"Requesting SMS code for {phone}")
            result = await client.send_code_request(phone)
            
            return {
                'success': True,
                'message': f'인증 코드가 전송되었습니다.',
                'require_code': True,
                'phone_code_hash': result.phone_code_hash
            }
        
        result = loop.run_until_complete(connect_and_auth())
        
        if 'phone_code_hash' in result:
            phone_code_hashes[phone] = result['phone_code_hash']
            del result['phone_code_hash']
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Connection error for {phone}: {e}")
        error_message = handle_telegram_error(e)
        return jsonify({
            'success': False,
            'error': error_message,
            'error_type': type(e).__name__
        }), 500

@app.route('/api/verify', methods=['POST'])
@error_handler
@validate_phone_required
def verify():
    """인증 코드 확인"""
    global clients, phone_code_hashes
    
    data = request.json
    phone = data.get('phone')
    code = data.get('code')
    password = data.get('password')
    
    if not code:
        return jsonify({'success': False, 'error': '인증 코드가 필요합니다'}), 400
    
    # 클라이언트 상태 검증
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 연결을 시도해주세요'}), 400
    
    is_valid, error_msg = validate_client_state(clients.get(phone), phone)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 401
    
    if phone not in phone_code_hashes:
        return jsonify({'success': False, 'error': '인증 코드를 먼저 요청해주세요'}), 400
    
    loop = get_or_create_loop()
    
    async def verify_code():
        client = clients[phone]
        phone_code_hash = phone_code_hashes[phone]
        
        try:
            # 인증 시도
            await client.sign_in(phone, code, phone_code_hash=phone_code_hash)
        except SessionPasswordNeededError:
            # 2단계 인증이 필요한 경우
            if not password:
                return {
                    'success': False,
                    'needs_password': True,
                    'error': '2단계 인증 비밀번호가 필요합니다.'
                }
            
            # 비밀번호로 재시도
            await client.sign_in(password=password)
        
        # 로그인 성공
        user = await client.get_me()
        logger.info(f"Successfully logged in: {user.first_name} ({phone})")
        
        # 세션 백업
        session_manager.backup_session(phone)
        
        return {
            'success': True,
                'message': '로그인에 성공했습니다.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': user.phone
                }
            }
        
        result = loop.run_until_complete(verify_code())
        
        # 사용한 코드 해시 삭제
        if result['success'] and phone in phone_code_hashes:
            del phone_code_hashes[phone]
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Verification error for {phone}: {e}")
        error_message = handle_telegram_error(e)
        return jsonify({
            'success': False,
            'error': error_message,
            'error_type': type(e).__name__
        }), 500

@app.route('/api/groups', methods=['POST'])
@login_required
@require_config
def get_groups():
    """그룹 목록 조회"""
    data = request.json
    phone = data.get('phone')
    refresh = data.get('refresh', False)
    
    try:
        loop = get_or_create_loop()
        
        async def fetch_groups():
            # 클라이언트 확인
            if phone not in clients:
                api_config = config_manager.get_api_config(phone)
                client = await create_client(phone, api_config)
                await client.connect()
                clients[phone] = client
            else:
                client = clients[phone]
                if not client.is_connected():
                    await client.connect()
            
            # 인증 확인
            if not await client.is_user_authorized():
                return {'success': False, 'error': '로그인이 필요합니다.', 'need_auth': True}
            
            logger.info(f"Fetching groups for {phone} (refresh={refresh})")
            
            # 그룹 목록 가져오기
            groups = []
            try:
                # 강제 새로고침 옵션
                if refresh:
                    dialogs = await client.get_dialogs(limit=None, force_refresh=True)
                else:
                    dialogs = await client.get_dialogs(limit=None)
                
                for dialog in dialogs:
                    if dialog.is_group or dialog.is_channel:
                        try:
                            # 그룹 정보 추출
                            entity = dialog.entity
                            
                            # 접근 가능 여부 확인
                            can_access = True
                            try:
                                # 메시지 1개만 가져와서 접근 가능한지 확인
                                async for _ in client.iter_messages(entity, limit=1):
                                    break
                            except Exception:
                                can_access = False
                            
                            if can_access:
                                groups.append({
                                    'id': dialog.id,
                                    'title': dialog.title or f'그룹_{dialog.id}',
                                    'is_channel': dialog.is_channel,
                                    'is_group': dialog.is_group,
                                    'participants_count': getattr(entity, 'participants_count', 0),
                                    'unread_count': dialog.unread_count
                                })
                        except Exception as e:
                            logger.warning(f"Skipping group {dialog.id}: {e}")
                            continue
                
            except Exception as e:
                logger.error(f"Error fetching groups: {e}")
                return {'success': False, 'error': '그룹 목록을 가져오는 중 오류가 발생했습니다.'}
            
            logger.info(f"Found {len(groups)} accessible groups for {phone}")
            
            return {
                'success': True,
                'groups': groups,
                'count': len(groups)
            }
        
        return jsonify(loop.run_until_complete(fetch_groups()))
        
    except Exception as e:
        logger.error(f"Groups error for {phone}: {e}")
        error_message = handle_telegram_error(e)
        return jsonify({
            'success': False,
            'error': error_message
        }), 500

@app.route('/api/send/message', methods=['POST'])
@error_handler
@login_required
@require_config
def send_message():
    """메시지 전송"""
    data = request.json
    phone = data.get('phone')
    group_ids = data.get('group_ids', [])
    message = data.get('message')
    
    if not group_ids or not message:
        return jsonify({'success': False, 'error': '그룹 ID와 메시지가 필요합니다'}), 400
    
    if not isinstance(group_ids, list):
        group_ids = [group_ids]
    
    # 클라이언트 상태 검증
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 401
    
    is_valid, error_msg = validate_client_state(clients.get(phone), phone)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 401
    
    loop = get_or_create_loop()
    
    async def send():
        client = clients[phone]
        
        # 연결 상태 확인 및 재연결
        if not await ensure_client_connected(client):
            return {'success': False, 'error': '클라이언트 연결에 실패했습니다'}
        
        if not await client.is_user_authorized():
            return {'success': False, 'error': '인증이 필요합니다', 'need_auth': True}
        
        results = []
        successful = 0
        
        for group_id in group_ids:
            try:
                await client.send_message(int(group_id), message)
                results.append({
                    'group_id': group_id,
                    'success': True
                })
                successful += 1
                logger.info(f"Message sent to group {group_id}")
            except Exception as e:
                logger.error(f"Failed to send to group {group_id}: {e}")
                results.append({
                    'group_id': group_id,
                    'success': False,
                    'error': str(e)
                })
        
        return {
            'success': True,
            'message': f'{successful}/{len(group_ids)}개 그룹에 메시지를 전송했습니다.',
            'results': results,
            'successful': successful,
            'failed': len(group_ids) - successful
        }
    
    return jsonify(loop.run_until_complete(send()))

@app.route('/api/send/images', methods=['POST'])
@error_handler
@login_required
@require_config
def send_images():
    """이미지 전송"""
    data = request.json
    phone = data.get('phone')
    group_ids = data.get('group_ids', [])
    message = data.get('message', '')
    images = data.get('images', [])
    
    if not group_ids or not images:
        return jsonify({'success': False, 'error': '그룹 ID와 이미지가 필요합니다'}), 400
    
    if not isinstance(group_ids, list):
        group_ids = [group_ids]
    
    # 클라이언트 상태 검증
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 401
    
    is_valid, error_msg = validate_client_state(clients.get(phone), phone)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 401
    
    loop = get_or_create_loop()
    
    async def send():
        client = clients[phone]
        
        # 연결 상태 확인 및 재연결
        if not await ensure_client_connected(client):
            return {'success': False, 'error': '클라이언트 연결에 실패했습니다'}
        
        if not await client.is_user_authorized():
            return {'success': False, 'error': '인증이 필요합니다', 'need_auth': True}
        
        # 임시 파일 생성 및 전송
        temp_files = []
        results = []
        successful = 0
        
        # 컨텍스트 매니저를 사용하여 임시 파일 생성
        for idx, image in enumerate(images):
            image_data = base64.b64decode(image['data'])
            
            # 파일 확장자 결정
            ext = '.jpg'
            if 'type' in image:
                if 'png' in image['type'].lower():
                    ext = '.png'
                elif 'gif' in image['type'].lower():
                    ext = '.gif'
            
            # 컨텍스트 매니저를 사용하여 자동 정리
            with temporary_file(suffix=ext, delete=False) as temp_path:
                with open(temp_path, 'wb') as f:
                    f.write(image_data)
                temp_files.append(temp_path)
                logger.info(f"Created temp file: {temp_path}")
                
                # 각 그룹에 전송
                results = []
                successful = 0
                
                for group_id in group_ids:
                    try:
                        # 메시지가 있으면 먼저 전송
                        if message:
                            await client.send_message(int(group_id), message)
                        
                        # 이미지 전송
                        for temp_file in temp_files:
                            await client.send_file(int(group_id), temp_file)
                        
                        results.append({
                            'group_id': group_id,
                            'success': True
                        })
                        successful += 1
                        logger.info(f"Images sent to group {group_id}")
                        
                    except Exception as e:
                        logger.error(f"Failed to send images to group {group_id}: {e}")
                        results.append({
                            'group_id': group_id,
                            'success': False,
                            'error': str(e)
                        })
                
        # 각 그룹에 전송 (temp_files 루프 밖에서)
        try:
            for group_id in group_ids:
                try:
                    await client.send_file(int(group_id), temp_files, caption=message)
                    results.append({
                        'group_id': group_id,
                        'success': True
                    })
                    successful += 1
                    logger.info(f"Images sent to group {group_id}")
                except Exception as e:
                    logger.error(f"Failed to send to group {group_id}: {e}")
                    results.append({
                        'group_id': group_id,
                        'success': False,
                        'error': str(e)
                    })
            
            return {
                'success': True,
                'message': f'{successful}/{len(group_ids)}개 그룹에 이미지를 전송했습니다.',
                'results': results,
                'successful': successful,
                'failed': len(group_ids) - successful
            }
        finally:
            # 임시 파일 정리
            for temp_file in temp_files:
                try:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                        logger.info(f"Deleted temp file: {temp_file}")
                except Exception as e:
                    logger.error(f"Failed to delete temp file: {e}")
    
    return jsonify(loop.run_until_complete(send()))

@app.route('/api/resend-code', methods=['POST'])
@login_required
@require_config
def resend_code():
    """인증 코드 재전송"""
    data = request.json
    phone = data.get('phone')
    
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 연결을 시도해주세요'}), 400
    
    loop = get_or_create_loop()
    
    async def resend():
        client = clients[phone]
        
        try:
            # 코드 재요청
            result = await client.send_code_request(phone)
            phone_code_hashes[phone] = result.phone_code_hash
            
            logger.info(f"Resent verification code to {phone}")
            
            return {
                'success': True,
                'message': '인증 코드가 재전송되었습니다.'
            }
        except FloodWaitError as e:
            return {
                'success': False,
                'error': f'너무 많은 요청입니다. {e.seconds}초 후에 다시 시도하세요.',
                'wait_seconds': e.seconds
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'코드 재전송 실패: {handle_telegram_error(e)}'
            }
    
    return jsonify(loop.run_until_complete(resend()))

@app.route('/api/disconnect', methods=['POST'])
@login_required
def disconnect():
    """연결 해제"""
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    try:
        if phone in clients:
            loop = get_or_create_loop()
            
            async def disconnect_client():
                if clients[phone].is_connected():
                    await clients[phone].disconnect()
                    logger.info(f"Disconnected client for {phone}")
            
            loop.run_until_complete(disconnect_client())
            del clients[phone]
        
        if phone in phone_code_hashes:
            del phone_code_hashes[phone]
        
        return jsonify({
            'success': True,
            'message': '연결이 해제되었습니다.'
        })
        
    except Exception as e:
        logger.error(f"Disconnect error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sessions', methods=['GET'])
@login_required
def get_sessions():
    """세션 목록 조회"""
    sessions = session_manager.list_sessions()
    return jsonify({
        'success': True,
        'sessions': sessions,
        'count': len(sessions)
    })

@app.route('/api/accounts/auto-setup', methods=['GET'])
def get_auto_setup_phones():
    """자동 설정 전화번호 목록 반환"""
    # account_config.json에서 자동 설정용 전화번호 목록 가져오기
    try:
        import json
        config_path = os.path.join(os.path.dirname(__file__), 'account_config.json')
        with open(config_path, 'r', encoding='utf-8') as f:
            account_config = json.load(f)
        
        # firepower 계정 중 1-9번까지만 반환
        firepower_accounts = account_config.get('predefined_accounts', {}).get('firepower', [])
        auto_setup_phones = [acc['phone'] for acc in firepower_accounts if 1 <= acc.get('number', 0) <= 9]
        
        return jsonify({
            'success': True,
            'phones': auto_setup_phones
        })
    except Exception as e:
        logger.error(f"Failed to get auto setup phones: {e}")
        return jsonify({
            'success': True,
            'phones': []  # 오류 시 빈 배열 반환
        })

@app.route('/api/accounts/critical', methods=['GET'])
def get_critical_accounts():
    """중요 계정 목록 반환"""
    try:
        import json
        config_path = os.path.join(os.path.dirname(__file__), 'account_config.json')
        with open(config_path, 'r', encoding='utf-8') as f:
            account_config = json.load(f)
        
        critical_accounts = account_config.get('critical_accounts', [])
        
        return jsonify({
            'success': True,
            'accounts': critical_accounts
        })
    except Exception as e:
        logger.error(f"Failed to get critical accounts: {e}")
        return jsonify({
            'success': True,
            'accounts': []  # 오류 시 빈 배열 반환
        })

@app.route('/api/sessions/cleanup', methods=['POST'])
@login_required
def cleanup_sessions():
    """문제가 있는 세션 정리"""
    data = request.json
    phone = data.get('phone')
    
    if phone:
        # 특정 세션 정리
        success = session_manager.clean_session(phone)
        return jsonify({
            'success': success,
            'message': '세션이 정리되었습니다.' if success else '세션 정리에 실패했습니다.'
        })
    else:
        # 모든 세션 검사 및 정리
        cleaned = 0
        sessions = session_manager.list_sessions()
        
        for session in sessions:
            phone = session['phone']
            health = session_manager.check_session_health(phone)
            if not health['healthy']:
                if session_manager.clean_session(phone):
                    cleaned += 1
        
        return jsonify({
            'success': True,
            'message': f'{cleaned}개의 세션이 정리되었습니다.',
            'cleaned': cleaned
        })

def auto_load_sessions():
    """서버 시작 시 기존 세션 자동 로드"""
    logger.info("Auto-loading existing sessions...")
    
    sessions = session_manager.list_sessions()
    loaded = 0
    
    for session in sessions:
        phone = session['phone']
        api_config = config_manager.get_api_config(phone)
        
        if api_config:
            try:
                loop = get_or_create_loop()
                
                async def load_session():
                    client = await create_client(phone, api_config)
                    clients[phone] = client
                    logger.info(f"Loaded session for {phone}")
                
                loop.run_until_complete(load_session())
                loaded += 1
            except Exception as e:
                logger.error(f"Failed to load session for {phone}: {e}")
    
    logger.info(f"Auto-loaded {loaded} sessions")

# 프론트엔드와 일치하는 API 추가
@app.route('/api/send-message', methods=['POST'])
@login_required
def send_message_alias():
    """send-message 엔드포인트 (send/message의 alias)"""
    return send_message()

@app.route('/api/get-logged-accounts', methods=['GET'])
@login_required
def get_logged_accounts():
    """로그인된 계정 목록 반환"""
    logged_accounts = []
    
    for phone, client in clients.items():
        try:
            if client.is_connected():
                loop = get_or_create_loop()
                
                async def check_auth():
                    if await client.is_user_authorized():
                        user = await client.get_me()
                        return {
                            'phone': phone,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'username': user.username,
                            'authorized': True
                        }
                    return None
                
                account_info = loop.run_until_complete(check_auth())
                if account_info:
                    logged_accounts.append(account_info)
        except Exception as e:
            logger.error(f"Error checking account {phone}: {e}")
    
    return jsonify({
        'success': True,
        'accounts': logged_accounts
    })

@app.route('/api/get-groups', methods=['POST'])
@login_required
def get_groups_alias():
    """그룹 목록 가져오기 (groups의 alias)"""
    return get_groups()

@app.route('/api/test-connection', methods=['POST'])
@login_required
def test_connection():
    """연결 테스트"""
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    if phone not in clients:
        return jsonify({'success': False, 'error': '연결되지 않은 계정입니다'}), 400
    
    try:
        client = clients[phone]
        if client.is_connected():
            return jsonify({'success': True, 'message': '연결 상태 양호'})
        else:
            return jsonify({'success': False, 'error': '연결이 끊긴 상태'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/verify-password', methods=['POST'])
@login_required
def verify_password():
    """2단계 인증 비밀번호 확인"""
    return verify()  # 기존 verify 함수가 비밀번호도 처리함

@app.route('/api/proxy-status', methods=['GET'])
@login_required
def proxy_status():
    """프록시 상태 확인"""
    proxy_info = {
        'proxy_pool': config_manager.get('proxies.proxy_pool', {}),
        'proxy_mapping': config_manager.get('proxies.proxy_account_mapping', {})
    }
    
    # 민감한 정보 제거
    safe_proxy_info = {
        'pool_count': len(proxy_info['proxy_pool']),
        'mapped_count': len(proxy_info['proxy_mapping']),
        'active_proxies': []
    }
    
    for proxy_id, proxy_data in proxy_info['proxy_pool'].items():
        safe_proxy_info['active_proxies'].append({
            'id': proxy_id,
            'addr': proxy_data.get('addr', ''),
            'port': proxy_data.get('port', 0),
            'accounts': len(proxy_data.get('accounts', []))
        })
    
    return jsonify({
        'success': True,
        'proxy_info': safe_proxy_info
    })

@app.route('/api/get-api-configs', methods=['GET'])
def get_api_configs():
    """API 설정 목록 반환"""
    api_configs = config_manager.get('telegram.api_configs', {})
    safe_configs = []
    
    for phone, config in api_configs.items():
        safe_configs.append({
            'phone': phone,
            'has_api_id': bool(config.get('api_id')),
            'has_api_hash': bool(config.get('api_hash'))
        })
    
    return jsonify({
        'success': True,
        'configs': safe_configs
    })

@app.route('/api/save-api-config', methods=['POST'])
def save_api_config():
    """API 설정 저장"""
    data = request.json
    configs = data.get('configs', {})
    
    try:
        for phone, api_config in configs.items():
            if api_config.get('api_id') and api_config.get('api_hash'):
                config_manager.add_api_config(
                    phone,
                    api_config['api_id'],
                    api_config['api_hash']
                )
        
        return jsonify({
            'success': True,
            'message': 'API 설정이 저장되었습니다.'
        })
    except Exception as e:
        logger.error(f"Failed to save API configs: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/register-user-api', methods=['POST'])
def register_user_api():
    """API 등록 (api_register 모듈로 전달)"""
    # api_register.py의 start_registration 함수 호출
    from api_register import start_registration
    return start_registration()

@app.route('/api/delete-user-api', methods=['POST'])
def delete_user_api():
    """API 삭제"""
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    try:
        # API 설정 삭제
        api_configs = config_manager.get('telegram.api_configs', {})
        if phone in api_configs:
            del api_configs[phone]
            config_manager.set('telegram.api_configs', api_configs)
            config_manager.save_config()
        
        # 프록시 매핑 삭제
        proxy_mapping = config_manager.get('proxies.proxy_account_mapping', {})
        if phone in proxy_mapping:
            del proxy_mapping[phone]
            config_manager.set('proxies.proxy_account_mapping', proxy_mapping)
            config_manager.save_config()
        
        # 연결된 클라이언트 삭제
        if phone in clients:
            loop = get_or_create_loop()
            async def disconnect_client():
                if clients[phone].is_connected():
                    await clients[phone].disconnect()
            loop.run_until_complete(disconnect_client())
            del clients[phone]
        
        return jsonify({
            'success': True,
            'message': 'API가 삭제되었습니다.'
        })
    except Exception as e:
        logger.error(f"Failed to delete API: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/get-registered-apis', methods=['GET'])
def get_registered_apis():
    """API 등록 목록 (api_register 모듈에서 가져옴)"""
    from api_register import get_accounts_list
    # api_register.py의 list 함수 호출
    return get_accounts_list()

@app.route('/api/app-auth-request', methods=['POST'])
def app_auth_request():
    """앱 인증 요청 (현재 미구현)"""
    return jsonify({
        'success': False,
        'error': '앱 인증 기능은 현재 지원되지 않습니다.'
    })

def graceful_shutdown():
    """서버 종료 시 정리"""
    logger.info("Shutting down gracefully...")
    
    loop = get_or_create_loop()
    
    async def disconnect_all():
        for phone, client in clients.items():
            try:
                if client.is_connected():
                    await client.disconnect()
                    logger.info(f"Disconnected {phone}")
            except Exception as e:
                logger.error(f"Error disconnecting {phone}: {e}")
    
    loop.run_until_complete(disconnect_all())
    logger.info("Shutdown complete")

if __name__ == '__main__':
    import signal
    import atexit
    
    # 종료 시그널 처리
    atexit.register(graceful_shutdown)
    signal.signal(signal.SIGTERM, lambda signum, frame: graceful_shutdown())
    signal.signal(signal.SIGINT, lambda signum, frame: graceful_shutdown())
    
    # 서버 정보
    host = config_manager.get('server.host', '127.0.0.1')
    port = config_manager.get('server.port', 5555)
    
    print("=" * 60)
    print("Telegram Multi-Account Manager Server")
    print("=" * 60)
    print(f"Server: http://{host}:{port}")
    print(f"Config: {config_manager.config_file}")
    print(f"Sessions: {session_manager.sessions_dir}")
    print(f"Logs: logs/")
    print("=" * 60)
    
    # 기존 세션 자동 로드
    auto_load_sessions()
    
    # 서버 시작
    try:
        app.run(
            host=host,
            port=port,
            debug=config_manager.get('server.debug', False),
            threaded=False
        )
    except KeyboardInterrupt:
        print("\nShutting down...")
        graceful_shutdown()