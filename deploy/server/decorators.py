"""
공통 데코레이터 모음 - 중복된 패턴 제거
"""

from functools import wraps
from flask import jsonify
import logging
import asyncio
from telethon.errors import (
    FloodWaitError, PhoneNumberInvalidError, 
    SessionPasswordNeededError, AuthKeyUnregisteredError
)

def error_handler(func):
    """API 엔드포인트용 에러 핸들링 데코레이터
    
    모든 API 엔드포인트의 공통 에러 처리 로직을 통합
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FloodWaitError as e:
            return jsonify({
                'success': False,
                'error': f'너무 많은 요청입니다. {e.seconds}초 후에 다시 시도하세요.'
            }), 429
        except PhoneNumberInvalidError:
            return jsonify({
                'success': False,
                'error': '유효하지 않은 전화번호입니다.'
            }), 400
        except SessionPasswordNeededError:
            return jsonify({
                'success': False,
                'error': '2단계 인증 비밀번호가 필요합니다.',
                'needs_password': True
            }), 400
        except AuthKeyUnregisteredError:
            return jsonify({
                'success': False,
                'error': '세션이 만료되었습니다. 다시 로그인하세요.'
            }), 401
        except Exception as e:
            logger = logging.getLogger(func.__module__)
            logger.error(f"Error in {func.__name__}: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'error': f'오류가 발생했습니다: {str(e)}'
            }), 500
    
    return wrapper

def async_error_handler(func):
    """비동기 함수용 에러 핸들링 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
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
        except Exception as e:
            logger = logging.getLogger(func.__module__)
            logger.error(f"Async error in {func.__name__}: {str(e)}")
            return {
                'success': False,
                'error': f'오류가 발생했습니다: {str(e)}'
            }
    
    return wrapper

def validate_phone_required(func):
    """전화번호 필수 검증 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        from flask import request
        
        data = request.json or {}
        phone = data.get('phone')
        
        if not phone:
            return jsonify({
                'success': False,
                'error': '전화번호가 필요합니다.'
            }), 400
        
        if not phone.startswith('+'):
            return jsonify({
                'success': False,
                'error': '전화번호는 +로 시작해야 합니다. (예: +1234567890)'
            }), 400
        
        return func(*args, **kwargs)
    
    return wrapper

def client_required(func):
    """클라이언트 상태 검증 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        from flask import request
        
        # clients 딕셔너리가 함수의 모듈에 있다고 가정
        module = __import__(func.__module__, fromlist=['clients'])
        clients = getattr(module, 'clients', {})
        
        data = request.json or {}
        phone = data.get('phone')
        
        if not phone or phone not in clients:
            return jsonify({
                'success': False,
                'error': '로그인되지 않은 계정입니다.'
            }), 401
        
        client = clients[phone]
        if hasattr(client, '_disconnected') and client._disconnected:
            return jsonify({
                'success': False,
                'error': '연결이 끊어졌습니다. 다시 로그인하세요.'
            }), 401
        
        return func(*args, **kwargs)
    
    return wrapper