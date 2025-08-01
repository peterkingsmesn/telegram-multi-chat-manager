import os
import logging
import json
from datetime import datetime
import shutil
import sqlite3
import asyncio
from telethon import TelegramClient
import socks
import tempfile
from contextlib import contextmanager

# 로깅 설정
def setup_logging(log_dir='logs'):
    """로깅 시스템 초기화"""
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    log_file = os.path.join(log_dir, f'telegram_server_{datetime.now().strftime("%Y%m%d")}.log')
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    
    return logging.getLogger(__name__)

# 세션 관리 유틸리티
class SessionManager:
    def __init__(self, sessions_dir='sessions'):
        self.sessions_dir = sessions_dir
        self.logger = logging.getLogger(self.__class__.__name__)
        self._ensure_sessions_dir()
    
    def _ensure_sessions_dir(self):
        """세션 디렉토리 확인 및 생성"""
        if not os.path.exists(self.sessions_dir):
            os.makedirs(self.sessions_dir)
            self.logger.info(f"Created sessions directory: {self.sessions_dir}")
    
    def get_session_path(self, phone):
        """전화번호에 대한 세션 경로 반환"""
        phone_clean = phone.replace('+', '').replace(' ', '')
        return os.path.join(self.sessions_dir, phone_clean)
    
    def backup_session(self, phone):
        """세션 파일 백업"""
        session_path = self.get_session_path(phone)
        session_file = f"{session_path}.session"
        
        if os.path.exists(session_file):
            backup_path = f"{session_file}.backup"
            try:
                shutil.copy2(session_file, backup_path)
                self.logger.info(f"Backed up session for {phone}")
                return True
            except Exception as e:
                self.logger.error(f"Failed to backup session for {phone}: {e}")
                return False
        return False
    
    def check_session_health(self, phone):
        """세션 파일 상태 확인"""
        session_path = self.get_session_path(phone)
        session_file = f"{session_path}.session"
        
        if not os.path.exists(session_file):
            return {'exists': False, 'healthy': False}
        
        try:
            # SQLite 파일인지 확인
            conn = sqlite3.connect(session_file, timeout=1)
            conn.execute('SELECT COUNT(*) FROM sqlite_master')
            conn.close()
            return {'exists': True, 'healthy': True}
        except Exception as e:
            self.logger.warning(f"Session health check failed for {phone}: {e}")
            return {'exists': True, 'healthy': False}
    
    def clean_session(self, phone):
        """문제가 있는 세션 파일 정리"""
        session_path = self.get_session_path(phone)
        journal_file = f"{session_path}.session-journal"
        
        if os.path.exists(journal_file):
            try:
                os.remove(journal_file)
                self.logger.info(f"Removed journal file for {phone}")
                return True
            except Exception as e:
                self.logger.error(f"Failed to remove journal file: {e}")
                return False
        return True
    
    def list_sessions(self):
        """모든 세션 파일 목록 반환"""
        sessions = []
        if os.path.exists(self.sessions_dir):
            for file in os.listdir(self.sessions_dir):
                if file.endswith('.session'):
                    phone = '+' + file.replace('.session', '')
                    sessions.append({
                        'phone': phone,
                        'file': file,
                        'size': os.path.getsize(os.path.join(self.sessions_dir, file)),
                        'modified': datetime.fromtimestamp(
                            os.path.getmtime(os.path.join(self.sessions_dir, file))
                        ).isoformat()
                    })
        return sessions

# 설정 관리 유틸리티
class ConfigManager:
    def __init__(self, config_file='config.json'):
        self.config_file = config_file
        self.logger = logging.getLogger(self.__class__.__name__)
        self.config = self.load_config()
    
    def load_config(self):
        """설정 파일 로드"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                self.logger.info("Configuration loaded successfully")
                return config
            except Exception as e:
                self.logger.error(f"Failed to load config: {e}")
        
        # 기본 설정
        default_config = {
            "server": {
                "host": "127.0.0.1",
                "port": 5000,
                "cors_enabled": True
            },
            "telegram": {
                "api_configs": {},
                "default_api": {
                    "api_id": None,
                    "api_hash": None
                },
                "sessions_dir": "sessions"
            },
            "proxies": {
                "proxy_account_mapping": {},
                "proxy_pool": {}
            },
            "app": {
                "max_firepower_accounts": 30,
                "message_send_delay": 800,
                "auto_sync_interval": 300000,
                "auto_sync_enabled": False
            }
        }
        
        self.save_config(default_config)
        return default_config
    
    def save_config(self, config=None):
        """설정 파일 저장"""
        if config is None:
            config = self.config
        
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            self.logger.info("Configuration saved successfully")
            return True
        except Exception as e:
            self.logger.error(f"Failed to save config: {e}")
            return False
    
    def get(self, key_path, default=None):
        """중첩된 설정 값 가져오기"""
        keys = key_path.split('.')
        value = self.config
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value
    
    def set(self, key_path, value):
        """중첩된 설정 값 설정"""
        keys = key_path.split('.')
        config = self.config
        
        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]
        
        config[keys[-1]] = value
        self.save_config()
    
    def add_api_config(self, phone, api_id, api_hash):
        """API 설정 추가"""
        if 'api_configs' not in self.config['telegram']:
            self.config['telegram']['api_configs'] = {}
        
        self.config['telegram']['api_configs'][phone] = {
            'api_id': api_id,
            'api_hash': api_hash
        }
        
        return self.save_config()
    
    def add_proxy_config(self, phone, proxy_info):
        """프록시 설정 추가"""
        if 'proxy_account_mapping' not in self.config['proxies']:
            self.config['proxies']['proxy_account_mapping'] = {}
        
        self.config['proxies']['proxy_account_mapping'][phone] = proxy_info
        
        return self.save_config()
    
    def get_api_config(self, phone):
        """전화번호에 대한 API 설정 가져오기"""
        api_configs = self.config.get('telegram', {}).get('api_configs', {})
        
        if phone in api_configs:
            return api_configs[phone]
        
        # 기본 API 사용
        default_api = self.config.get('telegram', {}).get('default_api', {})
        if default_api.get('api_id') and default_api.get('api_hash'):
            return default_api
        
        return None
    
    def list_accounts(self):
        """등록된 모든 계정 목록"""
        accounts = []
        api_configs = self.config.get('telegram', {}).get('api_configs', {})
        
        for phone, api_config in api_configs.items():
            proxy_info = self.config.get('proxies', {}).get('proxy_account_mapping', {}).get(phone)
            accounts.append({
                'phone': phone,
                'has_api': bool(api_config.get('api_id')),
                'has_proxy': bool(proxy_info)
            })
        
        return accounts

# 에러 핸들러
def handle_telegram_error(error):
    """텔레그램 에러를 사용자 친화적 메시지로 변환"""
    error_type = type(error).__name__
    error_message = str(error)
    
    if "PhoneNumberInvalidError" in error_type:
        return "유효하지 않은 전화번호입니다."
    elif "FloodWaitError" in error_type:
        seconds = getattr(error, 'seconds', 60)
        return f"요청이 너무 많습니다. {seconds}초 후에 다시 시도하세요."
    elif "PhoneCodeInvalidError" in error_type:
        return "인증 코드가 올바르지 않습니다."
    elif "SessionPasswordNeededError" in error_type:
        return "2단계 인증 비밀번호가 필요합니다."
    elif "UserDeactivatedError" in error_type:
        return "이 계정은 비활성화되었습니다."
    elif "AuthKeyUnregisteredError" in error_type:
        return "세션이 만료되었습니다. 다시 로그인하세요."
    elif "ConnectionError" in error_type or "ProxyError" in error_type:
        return "네트워크 연결 오류가 발생했습니다."
    else:
        return f"오류가 발생했습니다: {error_message}"

# 이벤트 루프 관리
def get_or_create_loop():
    """현재 스레드의 이벤트 루프를 가져오거나 생성"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop

# 테레그램 클라이언트 생성
async def create_telegram_client(phone, api_id, api_hash, session_path, proxy_info=None):
    """테레그램 클라이언트 생성 (프록시 지원)"""
    proxy_settings = None
    
    if proxy_info and proxy_info.get('addr'):
        proxy_settings = (
            socks.SOCKS5,
            proxy_info['addr'],
            proxy_info.get('port', 1080),
            True,
            proxy_info.get('username'),
            proxy_info.get('password')
        )
        logger = logging.getLogger('create_telegram_client')
        logger.info(f"Using proxy for {phone}: {proxy_info['addr']}")
    
    client = TelegramClient(
        session_path,
        api_id,
        api_hash,
        proxy=proxy_settings,
        timeout=30,
        connection_retries=3,
        retry_delay=3
    )
    
    return client

# 프록시 할당 관리
def get_proxy_for_phone(phone, config):
    """전화번호에 할당된 프록시 찾기"""
    logger = logging.getLogger('get_proxy_for_phone')
    
    try:
        logger.info(f"Looking for proxy for phone: {phone}")
        
        # 전화번호별 프록시 매핑 확인
        proxy_mapping = config.get('proxies', {}).get('proxy_account_mapping', {})
        if phone in proxy_mapping:
            proxy_info = proxy_mapping[phone]
            logger.info(f"Found dedicated proxy for {phone}: {proxy_info.get('proxy_id')}")
            return proxy_info.get('proxy_id'), proxy_info
        
        # 프록시 풀에서 가장 적게 사용된 프록시 찾기
        proxy_pool = config.get('proxies', {}).get('proxy_pool', {})
        if not proxy_pool:
            logger.info("No proxy pool available")
            return None, None
        
        # 각 프록시의 현재 사용 수 계산
        proxy_usage = {}
        for p_id, p_info in proxy_pool.items():
            proxy_usage[p_id] = len(p_info.get('accounts', []))
        
        # 가장 적게 사용된 프록시 선택
        if proxy_usage:
            min_proxy_id = min(proxy_usage, key=proxy_usage.get)
            min_proxy_info = proxy_pool[min_proxy_id]
            logger.info(f"Assigning least used proxy {min_proxy_id} to {phone} (current usage: {proxy_usage[min_proxy_id]})")
            
            # 프록시에 계정 추가
            if 'accounts' not in proxy_pool[min_proxy_id]:
                proxy_pool[min_proxy_id]['accounts'] = []
            
            if phone not in proxy_pool[min_proxy_id]['accounts']:
                proxy_pool[min_proxy_id]['accounts'].append(phone)
            
            return min_proxy_id, min_proxy_info
        
        logger.info("No suitable proxy found")
        return None, None
        
    except Exception as e:
        logger.error(f"Error getting proxy for phone: {e}")
        return None, None

# 클라이언트 검증 함수들
def validate_client_state(client, phone):
    """클라이언트 연결 상태 검증
    
    Args:
        client: TelegramClient 인스턴스
        phone: 전화번호
        
    Returns:
        tuple: (is_valid, error_message)
    """
    logger = logging.getLogger('validate_client_state')
    
    if not client:
        return False, "클라이언트가 존재하지 않습니다."
    
    if hasattr(client, '_disconnected') and client._disconnected:
        return False, "연결이 끊어졌습니다. 다시 로그인하세요."
    
    if hasattr(client, 'is_connected') and not client.is_connected():
        return False, "클라이언트가 연결되어 있지 않습니다."
    
    return True, None

def validate_phone_number(phone):
    """전화번호 형식 검증
    
    Args:
        phone: 검증할 전화번호
        
    Returns:
        tuple: (is_valid, normalized_phone, error_message)
    """
    if not phone:
        return False, None, "전화번호가 필요합니다."
    
    # 공백 제거
    phone = phone.strip()
    
    # 국제 전화번호 형식 확인
    if not phone.startswith('+'):
        return False, None, "전화번호는 +로 시작해야 합니다. (예: +1234567890)"
    
    # 숫자만 포함하는지 확인 (+ 제외)
    if not phone[1:].isdigit():
        return False, None, "전화번호는 숫자만 포함해야 합니다."
    
    # 최소 길이 확인
    if len(phone) < 8:  # +1234567 최소 8자
        return False, None, "전화번호가 너무 짧습니다."
    
    return True, phone, None

async def ensure_client_connected(client):
    """클라이언트 연결 상태 확인 및 재연결
    
    Args:
        client: TelegramClient 인스턴스
        
    Returns:
        bool: 연결 성공 여부
    """
    logger = logging.getLogger('ensure_client_connected')
    
    try:
        if client.is_connected():
            return True
        
        logger.info("Client disconnected, attempting to reconnect...")
        await client.connect()
        return True
        
    except Exception as e:
        logger.error(f"Failed to ensure client connection: {e}")
        return False

# 세션 복구 함수
def handle_locked_session(phone, sessions_dir):
    """잠긴 세션 파일 처리 및 복구"""
    logger = logging.getLogger('handle_locked_session')
    
    phone_clean = phone.replace('+', '').replace(' ', '')
    original_session = os.path.join(sessions_dir, f'{phone_clean}.session')
    
    if not os.path.exists(original_session):
        logger.info(f"Session file doesn't exist for {phone}")
        return True
    
    try:
        # 세션 파일 복사본 생성
        temp_session = original_session + '.temp'
        shutil.copy2(original_session, temp_session)
        
        # 원본 세션 파일 삭제
        os.remove(original_session)
        
        # 복사본을 원본으로 복원
        shutil.move(temp_session, original_session)
        
        logger.info(f"Successfully unlocked session for {phone}")
        
        # 저널 파일 정리
        journal_file = original_session + '-journal'
        if os.path.exists(journal_file):
            try:
                os.remove(journal_file)
                logger.info(f"Removed journal file for {phone}")
            except:
                pass
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to handle locked session for {phone}: {e}")
        
        # 마지막 시도: 모든 관련 파일 삭제 후 재생성
        try:
            for ext in ['', '-journal', '-wal', '-shm']:
                file_path = original_session + ext
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Removed {file_path}")
            
            return True
        except Exception as final_error:
            logger.error(f"Final cleanup failed: {final_error}")
            return False

# 임시 파일 처리 컨텍스트 매니저
@contextmanager
def temporary_file(suffix=None, prefix='tmp_', dir=None, delete=True):
    """임시 파일 생성 및 자동 정리를 위한 컨텍스트 매니저
    
    Args:
        suffix: 파일 확장자 (예: '.jpg', '.png')
        prefix: 파일명 접두사
        dir: 임시 파일 생성 디렉토리 (None이면 시스템 기본값)
        delete: 종료 시 파일 삭제 여부
        
    Yields:
        str: 임시 파일 경로
    """
    logger = logging.getLogger('temporary_file')
    temp_file = None
    
    try:
        # 임시 파일 생성
        fd, temp_file = tempfile.mkstemp(suffix=suffix, prefix=prefix, dir=dir)
        os.close(fd)  # 파일 디스크립터 닫기
        
        logger.debug(f"Created temporary file: {temp_file}")
        yield temp_file
        
    finally:
        # 정리
        if temp_file and delete and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
                logger.debug(f"Removed temporary file: {temp_file}")
            except Exception as e:
                logger.warning(f"Failed to remove temporary file {temp_file}: {e}")

@contextmanager
def temporary_directory(prefix='tmp_dir_', dir=None, delete=True):
    """임시 디렉토리 생성 및 자동 정리를 위한 컨텍스트 매니저
    
    Args:
        prefix: 디렉토리명 접두사
        dir: 부모 디렉토리 (None이면 시스템 기본값)
        delete: 종료 시 디렉토리 삭제 여부
        
    Yields:
        str: 임시 디렉토리 경로
    """
    logger = logging.getLogger('temporary_directory')
    temp_dir = None
    
    try:
        # 임시 디렉토리 생성
        temp_dir = tempfile.mkdtemp(prefix=prefix, dir=dir)
        logger.debug(f"Created temporary directory: {temp_dir}")
        yield temp_dir
        
    finally:
        # 정리
        if temp_dir and delete and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.debug(f"Removed temporary directory: {temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to remove temporary directory {temp_dir}: {e}")