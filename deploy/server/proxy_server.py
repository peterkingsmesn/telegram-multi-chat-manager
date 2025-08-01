from flask import Flask, request, jsonify, session
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, FloodWaitError, PhoneNumberInvalidError
import asyncio
import os
import json
from datetime import datetime
import base64
import nest_asyncio
import socks

# 유틸리티 및 공통 모듈 임포트
from utils import (
    setup_logging, SessionManager, ConfigManager, 
    handle_telegram_error, get_or_create_loop,
    create_telegram_client, get_proxy_for_phone,
    validate_client_state, validate_phone_number,
    ensure_client_connected
)
from app_factory import create_app
from decorators import error_handler, async_error_handler, validate_phone_required
from auth import auth_bp, login_required

# asyncio 중첩 허용
nest_asyncio.apply()

# 로깅 설정
logger = setup_logging()

# Flask 앱 생성 (앱 팩토리 사용)
app = create_app()
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')  # 세션용 시크릿 키

# Blueprint 등록
app.register_blueprint(auth_bp)

# 설정 및 세션 매니저 생성
config_manager = ConfigManager('../config.json')
config = config_manager.config  # 호환성을 위해 config 변수 유지
session_manager = SessionManager(config_manager.get('telegram.sessions_dir', 'sessions'))
SESSIONS_DIR = session_manager.sessions_dir

# 전역 클라이언트 관리
clients = {}
phone_code_hashes = {}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Server is running'})

@app.route('/config', methods=['GET'])
def get_config():
    """현재 설정 반환 (민감한 정보 제외)"""
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

@app.route('/api/connect', methods=['POST'])
@error_handler
@validate_phone_required
def connect():
    global clients, phone_code_hashes
    
    data = request.json
    phone = data.get('phone')
    logger.info(f"Connect request received for phone: {phone}")
    
    # API 설정 확인
    api_config = config_manager.get_api_config(phone)
    if not api_config:
        logger.warning(f"No API config found for {phone}")
        return jsonify({'success': False, 'error': 'API 설정을 찾을 수 없습니다. 먼저 API를 등록해주세요.'}), 400
    
    api_id = api_config.get('api_id')
    api_hash = api_config.get('api_hash')
    
    # 프록시 할당
    proxy_id, proxy_info = get_proxy_for_phone(phone, config)
    logger.info(f"Assigned proxy {proxy_id} to {phone}")
    
    # 세션 경로 설정
    session_path = session_manager.get_session_path(phone)
    
    loop = get_or_create_loop()
        
        # 기존 클라이언트가 있으면 연결 해제
        if phone in clients:
            try:
                if clients[phone].is_connected():
                    loop.run_until_complete(clients[phone].disconnect())
                logger.info(f"Disconnected existing client for {phone}")
            except Exception as e:
                logger.error(f"Error disconnecting client: {e}")
            del clients[phone]
        
        # 세션 상태 확인
        session_health = session_manager.check_session_health(phone)
        if session_health['exists'] and not session_health['healthy']:
            logger.warning(f"Unhealthy session detected for {phone}, cleaning up...")
            session_manager.clean_session(phone)
            session_manager.backup_session(phone)
        
        async def connect_async():
            # 클라이언트 생성
            client = await create_telegram_client(phone, api_id, api_hash, session_path, proxy_info)
            clients[phone] = client
            
            # 연결
            await client.connect()
            logger.info(f"Connected to Telegram for {phone}")
            
            # 인증 확인
            if await client.is_user_authorized():
                user = await client.get_me()
                logger.info(f"Already authorized: {user.first_name} ({phone})")
                return {
                    'success': True,
                    'message': f'{user.first_name}님으로 이미 로그인되어 있습니다.',
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
                'message': f'{phone}로 인증 코드가 전송되었습니다.',
                'require_code': True,
                'phone_code_hash': result.phone_code_hash
            }
        
        result = loop.run_until_complete(connect_async())
        
        if 'phone_code_hash' in result:
            phone_code_hashes[phone] = result['phone_code_hash']
            del result['phone_code_hash']
        
        return jsonify(result)

@app.route('/api/verify', methods=['POST'])
@error_handler
@validate_phone_required
def verify():
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
def get_groups():
    data = request.json
    phone = data.get('phone')
    refresh = data.get('refresh', False)
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 400
    
    try:
        loop = get_or_create_loop()
        
        async def fetch_groups():
            client = clients[phone]
            
            if not client.is_connected():
                await client.connect()
            
            if not await client.is_user_authorized():
                return {'success': False, 'error': '인증이 필요합니다', 'need_auth': True}
            
            logger.info(f"Fetching groups for {phone} (refresh={refresh})")
            
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
                            entity = dialog.entity
                            
                            # 접근 가능 여부 확인
                            can_access = True
                            try:
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
@validate_phone_required
def send_message():
    data = request.json
    phone = data.get('phone')
    group_ids = data.get('group_ids', [])
    message = data.get('message')
    
    if not group_ids or not message:
        return jsonify({'success': False, 'error': '그룹 ID와 메시지가 필요합니다'}), 400
    
    # 클라이언트 상태 검증
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 401
    
    is_valid, error_msg = validate_client_state(clients.get(phone), phone)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 401
    
    if not isinstance(group_ids, list):
        group_ids = [group_ids]
    
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
        
    except Exception as e:
        logger.error(f"Send message error: {e}")
        return jsonify({
            'success': False,
            'error': handle_telegram_error(e)
        }), 500

@app.route('/api/send/images', methods=['POST'])
def send_images():
    data = request.json
    phone = data.get('phone')
    group_ids = data.get('group_ids', [])
    message = data.get('message', '')
    images = data.get('images', [])
    
    if not phone or not group_ids or not images:
        return jsonify({'success': False, 'error': '전화번호, 그룹 ID, 이미지가 필요합니다'}), 400
    
    if phone not in clients:
        return jsonify({'success': False, 'error': '먼저 로그인해주세요'}), 400
    
    if not isinstance(group_ids, list):
        group_ids = [group_ids]
    
    try:
        loop = get_or_create_loop()
        
        async def send():
            client = clients[phone]
            
            if not client.is_connected():
                await client.connect()
            
            if not await client.is_user_authorized():
                return {'success': False, 'error': '인증이 필요합니다', 'need_auth': True}
            
            results = []
            successful = 0
            
            # 이미지 처리
            import tempfile
            temp_files = []
            
            try:
                for idx, image in enumerate(images):
                    image_data = base64.b64decode(image['data'])
                    
                    # 파일 확장자 결정
                    ext = '.jpg'
                    if 'type' in image:
                        if 'png' in image['type'].lower():
                            ext = '.png'
                        elif 'gif' in image['type'].lower():
                            ext = '.gif'
                    
                    # 임시 파일 생성
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                    temp_file.write(image_data)
                    temp_file.close()
                    temp_files.append(temp_file.name)
                
                # 각 그룹에 전송
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
                        os.unlink(temp_file)
                    except Exception as e:
                        logger.error(f"Failed to delete temp file: {e}")
        
        return jsonify(loop.run_until_complete(send()))
        
    except Exception as e:
        logger.error(f"Send images error: {e}")
        return jsonify({
            'success': False,
            'error': handle_telegram_error(e)
        }), 500

@app.route('/api/disconnect', methods=['POST'])
def disconnect():
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

if __name__ == '__main__':
    # 서버 정보
    host = config_manager.get('server.host', '127.0.0.1')
    port = config_manager.get('server.port', 5000)
    
    print("=" * 60)
    print("Telegram Proxy Server")
    print("=" * 60)
    print(f"Server: http://{host}:{port}")
    print(f"Config: {config_manager.config_file}")
    print(f"Sessions: {session_manager.sessions_dir}")
    print(f"Logs: logs/")
    print("=" * 60)
    
    # 서버 시작
    app.run(
        host=host,
        port=port,
        debug=config_manager.get('server.debug', False)
    )