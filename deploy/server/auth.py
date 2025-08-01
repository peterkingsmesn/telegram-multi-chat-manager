"""
인증 및 라이센스 관리 모듈
라이센스 서버와 통신하여 사용자 인증 처리
"""

from flask import Blueprint, request, jsonify, session
import requests
import hashlib
import json
from datetime import datetime, timedelta
import logging
from functools import wraps
import os

# Blueprint 생성
auth_bp = Blueprint('auth', __name__)

# 로거 설정
logger = logging.getLogger(__name__)

# 라이센스 서버 설정
LICENSE_SERVER_URL = os.environ.get('LICENSE_SERVER_URL', 'http://localhost:5001')
LICENSE_API_KEY = os.environ.get('LICENSE_API_KEY', 'optional-api-key')

# 세션 설정
SESSION_TIMEOUT = 24 * 60 * 60  # 24시간

def login_required(f):
    """로그인 필수 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': '로그인이 필요합니다.',
                'need_login': True
            }), 401
        
        # 세션 만료 확인
        if 'login_time' in session:
            login_time = datetime.fromisoformat(session['login_time'])
            if datetime.now() - login_time > timedelta(seconds=SESSION_TIMEOUT):
                session.clear()
                return jsonify({
                    'success': False,
                    'error': '세션이 만료되었습니다. 다시 로그인해주세요.',
                    'need_login': True
                }), 401
        
        return f(*args, **kwargs)
    return decorated_function

def verify_license(license_key, hardware_id):
    """라이센스 서버에 라이센스 검증 요청"""
    try:
        response = requests.post(
            f"{LICENSE_SERVER_URL}/api/verify",
            json={
                'license_key': license_key,
                'hardware_id': hardware_id,
                'api_key': LICENSE_API_KEY
            },
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"License verification failed: {response.status_code}")
            return {
                'success': False,
                'error': '라이센스 검증에 실패했습니다.'
            }
    except requests.exceptions.RequestException as e:
        logger.error(f"License server connection error: {e}")
        return {
            'success': False,
            'error': '라이센스 서버에 연결할 수 없습니다.'
        }

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """사용자 로그인"""
    data = request.json
    license_key = data.get('license_key')
    hardware_id = data.get('hardware_id')
    
    if not license_key or not hardware_id:
        return jsonify({
            'success': False,
            'error': '라이센스 키와 하드웨어 ID가 필요합니다.'
        }), 400
    
    # 라이센스 검증
    result = verify_license(license_key, hardware_id)
    
    if result.get('success'):
        # 세션 생성
        session['user_id'] = result.get('user_id')
        session['license_key'] = license_key
        session['hardware_id'] = hardware_id
        session['login_time'] = datetime.now().isoformat()
        session['license_type'] = result.get('license_type', 'basic')
        session['max_accounts'] = result.get('max_accounts', 30)
        
        logger.info(f"User logged in: {result.get('user_id')}")
        
        return jsonify({
            'success': True,
            'message': '로그인 성공',
            'user': {
                'user_id': result.get('user_id'),
                'license_type': result.get('license_type'),
                'max_accounts': result.get('max_accounts'),
                'expires_at': result.get('expires_at')
            }
        })
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', '라이센스 검증에 실패했습니다.')
        }), 401

@auth_bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """로그아웃"""
    user_id = session.get('user_id')
    session.clear()
    logger.info(f"User logged out: {user_id}")
    
    return jsonify({
        'success': True,
        'message': '로그아웃되었습니다.'
    })

@auth_bp.route('/api/auth/status', methods=['GET'])
def auth_status():
    """인증 상태 확인"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'authenticated': False
        })
    
    return jsonify({
        'success': True,
        'authenticated': True,
        'user': {
            'user_id': session.get('user_id'),
            'license_type': session.get('license_type'),
            'max_accounts': session.get('max_accounts')
        }
    })

@auth_bp.route('/api/auth/verify-session', methods=['POST'])
@login_required
def verify_session():
    """세션 유효성 재검증"""
    # 라이센스 서버에 세션 유효성 재확인
    result = verify_license(
        session.get('license_key'),
        session.get('hardware_id')
    )
    
    if not result.get('success'):
        session.clear()
        return jsonify({
            'success': False,
            'error': '라이센스가 만료되었거나 유효하지 않습니다.',
            'need_login': True
        }), 401
    
    # 세션 정보 업데이트
    session['license_type'] = result.get('license_type', 'basic')
    session['max_accounts'] = result.get('max_accounts', 30)
    
    return jsonify({
        'success': True,
        'message': '세션이 유효합니다.',
        'user': {
            'user_id': session.get('user_id'),
            'license_type': result.get('license_type'),
            'max_accounts': result.get('max_accounts'),
            'expires_at': result.get('expires_at')
        }
    })

def get_hardware_id():
    """하드웨어 ID 생성 (클라이언트 측에서 생성)"""
    import platform
    import uuid
    
    # MAC 주소 기반 하드웨어 ID 생성
    mac = uuid.getnode()
    system_info = f"{platform.system()}-{platform.machine()}-{mac}"
    
    # SHA256 해시로 변환
    hardware_id = hashlib.sha256(system_info.encode()).hexdigest()
    
    return hardware_id