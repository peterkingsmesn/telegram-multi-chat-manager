// 클라이언트 설정 파일
const ClientConfig = {
    // 서버 설정
    server: {
        baseUrl: 'http://localhost:5555',
        timeout: 30000
    },
    
    // 앱 설정
    app: {
        maxFirepowerAccounts: 30,
        messageSpeed: {
            default: 800,
            min: 300,
            max: 3000
        },
        autoSync: {
            enabled: false,
            interval: 5 * 60 * 1000 // 5분
        }
    },
    
    // UI 설정
    ui: {
        profitButtons: [
            { number: 1, capacity: 10 },
            { number: 2, capacity: 20 },
            { number: 3, capacity: 30 },
            { number: 4, capacity: 50 },
            { number: 5, capacity: 70 },
            { number: 6, capacity: 100 },
            { number: 7, capacity: 150 },
            { number: 8, capacity: 200 },
            { number: 9, capacity: 250 },
            { number: 10, capacity: 300 },
            { number: 11, capacity: 400 },
            { number: 12, capacity: 500 }
        ],
        templateCount: 10
    }
};

// 설정을 로컬 스토리지에서 로드하거나 기본값 사용
function loadClientConfig() {
    const saved = localStorage.getItem('clientConfig');
    if (saved) {
        try {
            const savedConfig = JSON.parse(saved);
            return Object.assign({}, ClientConfig, savedConfig);
        } catch (e) {
            console.error('Failed to load saved config:', e);
        }
    }
    return ClientConfig;
}

// 설정 저장
function saveClientConfig(config) {
    localStorage.setItem('clientConfig', JSON.stringify(config));
}