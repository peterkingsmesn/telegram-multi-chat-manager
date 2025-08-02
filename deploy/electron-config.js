// Electron 환경에서 클라이언트 설정을 동적으로 관리
const ElectronClientConfig = {
    loadConfig: function() {
        // Electron 환경에서는 동적 포트 사용
        const serverPort = window.SERVER_PORT || 5555;
        const baseUrl = `http://localhost:${serverPort}`;
        
        return {
            server: {
                baseUrl: baseUrl,
                timeout: 30000,
                retryAttempts: 3
            },
            app: {
                maxFirepowerAccounts: 30,
                maxExpertAccounts: 10,
                messageSpeed: {
                    default: 800,
                    min: 500,
                    max: 5000
                },
                autoSyncInterval: 300000,
                sessionTimeout: 24 * 60 * 60 * 1000
            },
            security: {
                encryptLocalStorage: true,
                clearSessionOnClose: false,
                requireHttps: false // 로컬 서버이므로 HTTPS 불필요
            },
            ui: {
                theme: 'dark',
                language: 'ko',
                animations: true
            }
        };
    },
    
    // 하드웨어 ID 가져오기 (라이센스 인증용)
    getHardwareId: async function() {
        if (window.electronAPI && window.electronAPI.getHardwareId) {
            return await window.electronAPI.getHardwareId();
        }
        // 폴백: 브라우저 환경
        return 'browser-' + navigator.userAgent.split(/\s/).join('');
    },
    
    // 설정 저장 (암호화)
    saveSecureConfig: async function(key, value) {
        if (window.electronAPI && window.electronAPI.saveConfig) {
            return await window.electronAPI.saveConfig({ [key]: value });
        }
        // 폴백: localStorage
        localStorage.setItem(key, JSON.stringify(value));
        return { success: true };
    },
    
    // 설정 불러오기 (복호화)
    loadSecureConfig: async function(key) {
        if (window.electronAPI && window.electronAPI.loadConfig) {
            const result = await window.electronAPI.loadConfig();
            if (result.success && result.config) {
                return result.config[key];
            }
        }
        // 폴백: localStorage
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    },
    
    // 세션 폴더 열기
    openSessionsFolder: async function() {
        if (window.electronAPI && window.electronAPI.openSessionsFolder) {
            await window.electronAPI.openSessionsFolder();
        } else {
            alert('이 기능은 Electron 앱에서만 사용 가능합니다.');
        }
    },
    
    // 앱 정보
    getAppInfo: function() {
        if (window.electronAPI && window.electronAPI.getAppInfo) {
            return window.electronAPI.getAppInfo();
        }
        return {
            version: 'web',
            platform: navigator.platform,
            arch: 'unknown'
        };
    }
};

// 전역 설정 객체 재정의
if (window.IS_ELECTRON) {
    window.ClientConfig = ElectronClientConfig.loadConfig();
    window.loadClientConfig = () => ElectronClientConfig.loadConfig();
    
    // API 기본 URL 업데이트
    window.addEventListener('DOMContentLoaded', () => {
        // 서버 포트가 변경되면 설정 업데이트
        setInterval(() => {
            const currentPort = window.SERVER_PORT || 5555;
            if (window.ClientConfig.server.baseUrl !== `http://localhost:${currentPort}`) {
                window.ClientConfig = ElectronClientConfig.loadConfig();
                console.log('Updated server configuration:', window.ClientConfig.server);
            }
        }, 1000);
    });
}