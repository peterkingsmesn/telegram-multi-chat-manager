"""
Flask 앱 팩토리 패턴 - 중복된 Flask 앱 초기화 코드 통합
"""

from flask import Flask
from flask_cors import CORS
import logging

def create_app(config=None):
    """Flask 애플리케이션 팩토리
    
    Args:
        config: 추가 설정 딕셔너리 (선택사항)
    
    Returns:
        Flask: 설정된 Flask 애플리케이션 인스턴스
    """
    app = Flask(__name__)
    
    # 기본 설정
    app.config['JSON_AS_ASCII'] = False
    app.config['JSON_SORT_KEYS'] = False
    
    # 추가 설정 적용
    if config:
        app.config.update(config)
    
    # CORS 설정
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:*", "http://127.0.0.1:*"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    return app

def register_blueprints(app, blueprints):
    """Blueprint 등록 헬퍼 함수
    
    Args:
        app: Flask 애플리케이션
        blueprints: 등록할 Blueprint 리스트
    """
    for blueprint in blueprints:
        app.register_blueprint(blueprint)
        logging.info(f"Registered blueprint: {blueprint.name}")