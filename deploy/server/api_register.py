"""
API 등록 및 인증 처리 모듈
화력 계정 등록 시 텔레그램 인증 필요
"""

from flask import Blueprint, request, jsonify
from telethon import TelegramClient
from telethon.errors import (
    SessionPasswordNeededError, FloodWaitError, PhoneNumberInvalidError,
    PhoneCodeInvalidError, ApiIdInvalidError
)
import asyncio
import logging
from utils import (
    ConfigManager, SessionManager, handle_telegram_error,
    get_or_create_loop, create_telegram_client,
    validate_phone_number
)
from decorators import error_handler, async_error_handler, validate_phone_required
import socks

# Blueprint 생성
api_register_bp = Blueprint('api_register', __name__)

# 로거 설정
logger = logging.getLogger(__name__)

# 임시 클라이언트 저장소 (등록 중인 계정)
temp_clients = {}
temp_code_hashes = {}

# get_or_create_loop는 utils에서 임포트

@api_register_bp.route('/api/register/start', methods=['POST'])
@error_handler
def start_registration():
    """API 등록 시작 - API 키 검증 및 연결"""
    data = request.json
    phone = data.get('phone')
    api_id = data.get('api_id')
    api_hash = data.get('api_hash')
    account_type = data.get('type', 'firepower')  # 'firepower' or 'expert'
    
    # 입력 검증
    if not all([phone, api_id, api_hash]):
        return jsonify({
            'success': False,
            'error': '전화번호, API ID, API Hash가 필요합니다.'
        }), 400
    
    # 전화번호 형식 검증
    is_valid, normalized_phone, error_msg = validate_phone_number(phone)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 400
    phone = normalized_phone
    
    try:
        api_id = int(api_id)
    except ValueError:
        return jsonify({
            'success': False,
            'error': 'API ID는 숫자여야 합니다.'
        }), 400
    
    # 프록시 설정 (선택사항)
    proxy_settings = None
    if 'proxy' in data and data['proxy']:
        proxy = data['proxy']
        proxy_settings = (
            socks.SOCKS5,
            proxy.get('addr'),
            proxy.get('port', 1080),
            True,
            proxy.get('username'),
            proxy.get('password')
        )
    
    loop = get_or_create_loop()
    
    @async_error_handler
    async def test_api_and_connect():
            # 기존 임시 클라이언트 정리
            if phone in temp_clients:
                try:
                    await temp_clients[phone].disconnect()
                except:
                    pass
                del temp_clients[phone]
            
            # 새 클라이언트 생성 (임시 세션)
            session_name = f"temp_register_{phone.replace('+', '')}"
            client = TelegramClient(
                session_name,
                api_id,
                api_hash,
                proxy=proxy_settings,
                timeout=30
            )
            
            # 연결 시도 (API 키 검증)
            try:
                await client.connect()
            except ApiIdInvalidError:
                return {
                    'success': False,
                    'error': 'API ID 또는 API Hash가 올바르지 않습니다.'
                }
            except Exception as e:
                return {
                    'success': False,
                    'error': f'연결 실패: {str(e)}'
                }
            
            temp_clients[phone] = client
            
            # 이미 인증된 경우
            if await client.is_user_authorized():
                user = await client.get_me()
                return {
                    'success': True,
                    'message': '이미 인증된 계정입니다.',
                    'already_authorized': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'first_name': user.first_name,
                        'phone': user.phone
                    },
                    'can_register': True
                }
            
            # SMS 코드 요청
            try:
                result = await client.send_code_request(phone)
                temp_code_hashes[phone] = result.phone_code_hash
                
                return {
                    'success': True,
                    'message': 'API 키가 확인되었습니다. 인증 코드가 전송되었습니다.',
                    'require_code': True,
                    'api_valid': True
                }
            except FloodWaitError as e:
                return {
                    'success': False,
                    'error': f'너무 많은 요청입니다. {e.seconds}초 후에 다시 시도하세요.'
                }
            except PhoneNumberInvalidError:
                return {
                    'success': False,
                    'error': '유효하지 않은 전화번호입니다.'
                }
        
    result = loop.run_until_complete(test_api_and_connect())
    
    # 임시 데이터 저장
    if result.get('success'):
        if phone not in temp_clients:
            temp_clients[phone] = {
                'api_id': api_id,
                'api_hash': api_hash,
                'type': account_type,
                'proxy': data.get('proxy')
            }
    
    return jsonify(result)

@api_register_bp.route('/api/register/verify', methods=['POST'])
@error_handler
@validate_phone_required
def verify_registration():
    """등록 인증 코드 확인 및 2차 비밀번호 처리"""
    data = request.json
    phone = data.get('phone')
    code = data.get('code')
    password = data.get('password')
    
    if not code:
        return jsonify({
            'success': False,
            'error': '인증 코드가 필요합니다.'
        }), 400
    
    if phone not in temp_clients or phone not in temp_code_hashes:
        return jsonify({
            'success': False,
            'error': '먼저 등록을 시작해주세요.'
        }), 400
    
    loop = get_or_create_loop()
    
    @async_error_handler
    async def verify_and_save():
            client = temp_clients[phone]
            
            # 딕셔너리인 경우 이미 인증된 상태
            if isinstance(client, dict):
                return {
                    'success': False,
                    'error': '이미 처리된 요청입니다.'
                }
            
            phone_code_hash = temp_code_hashes[phone]
            
            try:
                # 인증 시도
                await client.sign_in(phone, code, phone_code_hash=phone_code_hash)
            except SessionPasswordNeededError:
                # 2차 인증이 필요한 경우
                if not password:
                    return {
                        'success': False,
                        'needs_password': True,
                        'error': '2단계 인증 비밀번호가 필요합니다.'
                    }
                
                # 비밀번호로 재시도
                try:
                    await client.sign_in(password=password)
                except Exception as e:
                    return {
                        'success': False,
                        'error': f'비밀번호 인증 실패: {str(e)}'
                    }
            except PhoneCodeInvalidError:
                return {
                    'success': False,
                    'error': '인증 코드가 올바르지 않습니다.'
                }
            
            # 인증 성공 - 사용자 정보 가져오기
            user = await client.get_me()
            
            # 세션을 정식 위치로 이동
            session_manager = SessionManager()
            session_path = session_manager.get_session_path(phone)
            
            # 임시 세션 저장
            await client.disconnect()
            
            # 설정 저장
            config_manager = ConfigManager()
            
            # API 설정 저장
            config_manager.add_api_config(phone, client.api_id, client.api_hash)
            
            # 프록시 설정이 있으면 저장
            if client._proxy:
                proxy_info = {
                    'proxy_id': f'proxy_{phone}',
                    'addr': client._proxy[1],
                    'port': client._proxy[2],
                    'username': client._proxy[4],
                    'password': client._proxy[5]
                }
                config_manager.add_proxy_config(phone, proxy_info)
            
            # 계정 타입 저장
            account_info = config_manager.get('telegram.api_configs', {}).get(phone, {})
            account_info['type'] = temp_clients.get(phone, {}).get('type', 'firepower')
            config_manager.set(f'telegram.api_configs.{phone}', account_info)
            
            # 임시 데이터 정리
            del temp_clients[phone]
            del temp_code_hashes[phone]
            
            logger.info(f"Successfully registered {phone} as {account_info['type']}")
            
            return {
                'success': True,
                'message': 'API 등록이 완료되었습니다.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'phone': user.phone
                },
                'account_type': account_info['type']
            }
        
    result = loop.run_until_complete(verify_and_save())
    return jsonify(result)

@api_register_bp.route('/api/register/resend-code', methods=['POST'])
@error_handler
@validate_phone_required
def resend_verification_code():
    """인증 코드 재전송"""
    data = request.json
    phone = data.get('phone')
    
    if phone not in temp_clients:
        return jsonify({
            'success': False,
            'error': '먼저 등록을 시작해주세요.'
        }), 400
    
    loop = get_or_create_loop()
    
    @async_error_handler
    async def resend_code():
        client = temp_clients[phone]
        
        # 딕셔너리인 경우 이미 인증된 상태
        if isinstance(client, dict):
            return {
                'success': False,
                'error': '이미 처리된 요청입니다.'
            }
        
        try:
            # 코드 재요청
            result = await client.send_code_request(phone)
            temp_code_hashes[phone] = result.phone_code_hash
            
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
                'error': f'코드 재전송 실패: {str(e)}'
            }
    
    result = loop.run_until_complete(resend_code())
    return jsonify(result)

@api_register_bp.route('/api/register/cancel', methods=['POST'])
def cancel_registration():
    """등록 취소"""
    data = request.json
    phone = data.get('phone')
    
    if phone:
        # 임시 클라이언트 정리
        if phone in temp_clients:
            try:
                loop = get_or_create_loop()
                client = temp_clients[phone]
                if hasattr(client, 'disconnect'):
                    loop.run_until_complete(client.disconnect())
            except:
                pass
            del temp_clients[phone]
        
        if phone in temp_code_hashes:
            del temp_code_hashes[phone]
    
    return jsonify({
        'success': True,
        'message': '등록이 취소되었습니다.'
    })

@api_register_bp.route('/api/accounts/list', methods=['GET'])
def list_accounts():
    """등록된 계정 목록 조회"""
    config_manager = ConfigManager()
    session_manager = SessionManager()
    
    accounts = []
    api_configs = config_manager.get('telegram.api_configs', {})
    
    for phone, config in api_configs.items():
        # 세션 상태 확인
        session_health = session_manager.check_session_health(phone)
        
        accounts.append({
            'phone': phone,
            'type': config.get('type', 'firepower'),
            'has_session': session_health['exists'],
            'session_healthy': session_health.get('healthy', False),
            'api_id': config.get('api_id', 'N/A')
        })
    
    # 타입별로 정렬
    accounts.sort(key=lambda x: (x['type'], x['phone']))
    
    return jsonify({
        'success': True,
        'accounts': accounts,
        'count': {
            'total': len(accounts),
            'firepower': len([a for a in accounts if a['type'] == 'firepower']),
            'expert': len([a for a in accounts if a['type'] == 'expert'])
        }
    })

@api_register_bp.route('/api/accounts/remove', methods=['POST'])
@error_handler
@validate_phone_required
def remove_account():
    """계정 제거"""
    data = request.json
    phone = data.get('phone')
    
    config_manager = ConfigManager()
    session_manager = SessionManager()
    
    # 설정에서 제거
    api_configs = config_manager.get('telegram.api_configs', {})
    if phone in api_configs:
        del api_configs[phone]
        config_manager.set('telegram.api_configs', api_configs)
    
    # 프록시 설정 제거
    proxy_mapping = config_manager.get('proxies.proxy_account_mapping', {})
    if phone in proxy_mapping:
        del proxy_mapping[phone]
        config_manager.set('proxies.proxy_account_mapping', proxy_mapping)
    
    # 세션 파일 백업 (삭제하지 않음)
    session_manager.backup_session(phone)
    
    logger.info(f"Removed account: {phone}")
    
    return jsonify({
        'success': True,
        'message': '계정이 제거되었습니다.'
    })

# telegram_server.py에서 호출하는 함수들
def get_accounts_list():
    """계정 목록 반환 함수"""
    # 기존 list_accounts 함수와 동일
    config_manager = ConfigManager()
    session_manager = SessionManager(config_manager.get('telegram.sessions_dir', 'sessions'))
    
    accounts = config_manager.list_accounts()
    sessions = session_manager.list_sessions()
    
    # 세션 정보를 전화번호로 매핑
    session_map = {s['phone']: s for s in sessions}
    
    # 계정 정보 병합
    detailed_accounts = []
    firepower_count = 0
    expert_count = 0
    
    for account in accounts:
        phone = account['phone']
        account_info = {
            'phone': phone,
            'has_api': account['has_api'],
            'has_proxy': account['has_proxy'],
            'has_session': phone in session_map,
            'type': 'unknown'  # 기본값
        }
        
        # 간단한 타입 판별 로직 (예시)
        if 'firepower' in phone:
            account_info['type'] = 'firepower'
            firepower_count += 1
        elif 'expert' in phone:
            account_info['type'] = 'expert'
            expert_count += 1
        
        detailed_accounts.append(account_info)
    
    return jsonify({
        'success': True,
        'accounts': detailed_accounts,
        'count': {
            'total': len(detailed_accounts),
            'firepower': firepower_count,
            'expert': expert_count
        }
    })