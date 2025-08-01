from flask import Flask, request, jsonify
from flask_cors import CORS
import os

# 유틸리티 모듈 임포트
from utils import (
    setup_logging, ConfigManager, 
    get_proxy_for_phone
)

# 로깅 설정
logger = setup_logging()

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False  # 한글 JSON 지원

# 설정 매니저 생성
config_manager = ConfigManager('../config.json')
config = config_manager.config

# CORS 설정
if config_manager.get('server.cors_enabled', True):
    CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Proxy Server is running'})

@app.route('/api/proxy/status', methods=['GET'])
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
            'accounts': len(proxy_data.get('accounts', [])),
            'username': bool(proxy_data.get('username'))  # 사용자명 존재 여부만
        })
    
    return jsonify({
        'success': True,
        'proxy_info': safe_proxy_info
    })

@app.route('/api/proxy/assign', methods=['POST'])
def assign_proxy():
    """전화번호에 프록시 할당"""
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    try:
        proxy_id, proxy_info = get_proxy_for_phone(phone, config)
        
        if proxy_info:
            # 프록시 매핑 저장
            config_manager.add_proxy_config(phone, {
                'proxy_id': proxy_id,
                'addr': proxy_info.get('addr'),
                'port': proxy_info.get('port', 1080),
                'username': proxy_info.get('username'),
                'password': proxy_info.get('password')
            })
            
            return jsonify({
                'success': True,
                'proxy_id': proxy_id,
                'proxy_addr': proxy_info.get('addr'),
                'message': f'프록시 {proxy_id}가 할당되었습니다.'
            })
        else:
            return jsonify({
                'success': False,
                'error': '사용 가능한 프록시가 없습니다.'
            })
    except Exception as e:
        logger.error(f"Proxy assignment error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/proxy/remove', methods=['POST'])
def remove_proxy():
    """전화번호의 프록시 할당 해제"""
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'error': '전화번호가 필요합니다'}), 400
    
    try:
        proxy_mapping = config_manager.get('proxies.proxy_account_mapping', {})
        
        if phone in proxy_mapping:
            # 프록시 풀에서도 제거
            proxy_id = proxy_mapping[phone].get('proxy_id')
            if proxy_id:
                proxy_pool = config_manager.get('proxies.proxy_pool', {})
                if proxy_id in proxy_pool and 'accounts' in proxy_pool[proxy_id]:
                    if phone in proxy_pool[proxy_id]['accounts']:
                        proxy_pool[proxy_id]['accounts'].remove(phone)
                        config_manager.set('proxies.proxy_pool', proxy_pool)
            
            # 매핑에서 제거
            del proxy_mapping[phone]
            config_manager.set('proxies.proxy_account_mapping', proxy_mapping)
            config_manager.save_config()
            
            return jsonify({
                'success': True,
                'message': '프록시 할당이 해제되었습니다.'
            })
        else:
            return jsonify({
                'success': False,
                'error': '할당된 프록시가 없습니다.'
            })
    except Exception as e:
        logger.error(f"Proxy removal error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/proxy/test', methods=['POST'])
def test_proxy():
    """프록시 연결 테스트"""
    data = request.json
    proxy_info = data.get('proxy')
    
    if not proxy_info or not proxy_info.get('addr'):
        return jsonify({'success': False, 'error': '프록시 정보가 필요합니다'}), 400
    
    try:
        import socket
        import socks as pysocks
        
        # SOCKS5 프록시 테스트
        sock = pysocks.socksocket()
        sock.set_proxy(
            pysocks.SOCKS5,
            proxy_info['addr'],
            proxy_info.get('port', 1080),
            username=proxy_info.get('username'),
            password=proxy_info.get('password')
        )
        
        # Telegram 서버로 연결 시도
        sock.settimeout(10)
        sock.connect(('149.154.167.51', 443))  # Telegram DC1
        sock.close()
        
        return jsonify({
            'success': True,
            'message': '프록시 연결 성공'
        })
    except Exception as e:
        logger.error(f"Proxy test error: {e}")
        return jsonify({
            'success': False,
            'error': f'프록시 연결 실패: {str(e)}'
        }), 500

@app.route('/api/proxy/list', methods=['GET'])
def list_proxies():
    """프록시 목록 조회"""
    proxy_pool = config_manager.get('proxies.proxy_pool', {})
    proxy_list = []
    
    for proxy_id, proxy_data in proxy_pool.items():
        proxy_list.append({
            'id': proxy_id,
            'addr': proxy_data.get('addr', ''),
            'port': proxy_data.get('port', 1080),
            'has_auth': bool(proxy_data.get('username')),
            'account_count': len(proxy_data.get('accounts', [])),
            'accounts': proxy_data.get('accounts', [])
        })
    
    return jsonify({
        'success': True,
        'proxies': proxy_list,
        'total': len(proxy_list)
    })

@app.route('/api/proxy/add', methods=['POST'])
def add_proxy():
    """새 프록시 추가"""
    data = request.json
    proxy_id = data.get('id')
    proxy_info = data.get('proxy')
    
    if not proxy_id or not proxy_info or not proxy_info.get('addr'):
        return jsonify({'success': False, 'error': '프록시 ID와 주소가 필요합니다'}), 400
    
    try:
        proxy_pool = config_manager.get('proxies.proxy_pool', {})
        
        if proxy_id in proxy_pool:
            return jsonify({'success': False, 'error': '이미 존재하는 프록시 ID입니다'}), 400
        
        proxy_pool[proxy_id] = {
            'addr': proxy_info['addr'],
            'port': proxy_info.get('port', 1080),
            'username': proxy_info.get('username'),
            'password': proxy_info.get('password'),
            'accounts': []
        }
        
        config_manager.set('proxies.proxy_pool', proxy_pool)
        config_manager.save_config()
        
        return jsonify({
            'success': True,
            'message': '프록시가 추가되었습니다.',
            'proxy_id': proxy_id
        })
    except Exception as e:
        logger.error(f"Add proxy error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # 서버 정보
    host = config_manager.get('server.host', '127.0.0.1')
    port = config_manager.get('server.proxy_port', 5001)  # 프록시 서버는 다른 포트 사용
    
    print("=" * 60)
    print("Telegram Proxy Management Server")
    print("=" * 60)
    print(f"Server: http://{host}:{port}")
    print(f"Config: {config_manager.config_file}")
    print(f"Main API: /api/proxy/*")
    print("=" * 60)
    
    # 서버 시작
    app.run(
        host=host,
        port=port,
        debug=config_manager.get('server.debug', False)
    )