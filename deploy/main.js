const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');
const { machineIdSync } = require('node-machine-id');
const fs = require('fs');
const crypto = require('crypto');
const { setupAutoUpdater } = require('./auto-updater-config');

// 환경 설정
require('dotenv').config();

// 로그 파일 설정
const log = require('electron-log');
log.transports.file.level = 'info';
log.info('App starting...');

// 보안 설정을 위한 암호화 키
const ENCRYPTION_KEY = crypto.scryptSync(machineIdSync(), 'salt', 32);
const IV_LENGTH = 16;

// 설정 저장소
const store = new Store({
  encryptionKey: ENCRYPTION_KEY.toString('hex').substring(0, 32),
  schema: {
    apiConfigs: { type: 'object' },
    proxyConfigs: { type: 'object' },
    licenseKey: { type: 'string' },
    serverPort: { type: 'number', default: 5555 }
  }
});

let mainWindow;
let pythonProcess;
let serverPort = store.get('serverPort', 5555);

// 암호화 함수
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 복호화 함수
function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Python 서버 시작
function startPythonServer() {
  return new Promise((resolve, reject) => {
    // 포함된 Python 사용
    const pythonPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'python', 'python.exe')
      : path.join(__dirname, 'python-embed', 'python.exe');
    
    const serverScript = app.isPackaged
      ? path.join(process.resourcesPath, 'python', 'run_server.py')
      : path.join(__dirname, 'python-embed', 'run_server.py');

    log.info(`Python path: ${pythonPath}`);
    log.info(`Server script: ${serverScript}`);

    // Python 실행 파일 확인
    if (!fs.existsSync(pythonPath)) {
      const error = `Python not found at: ${pythonPath}`;
      log.error(error);
      reject(new Error(error));
      return;
    }

    if (!fs.existsSync(serverScript)) {
      const error = `Server script not found at: ${serverScript}`;
      log.error(error);
      reject(new Error(error));
      return;
    }

    // 사용 가능한 포트 찾기
    findAvailablePort(serverPort).then(port => {
      serverPort = port;
      
      // 환경 변수 설정
      const env = {
        ...process.env,
        FLASK_ENV: 'production',
        SECRET_KEY: crypto.randomBytes(32).toString('hex'),
        SERVER_PORT: port.toString(),
        ELECTRON_RUN: 'true',
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: app.isPackaged 
          ? path.join(process.resourcesPath, 'python', 'Lib', 'site-packages')
          : path.join(__dirname, 'python-embed', 'Lib', 'site-packages')
      };

      // 보안 설정 추가
      if (store.has('licenseKey')) {
        env.LICENSE_KEY = decrypt(store.get('licenseKey'));
      }

      log.info(`Starting Python server on port ${port}...`);
      
      pythonProcess = spawn(pythonPath, [serverScript], {
        env,
        windowsHide: true,
        cwd: app.isPackaged 
          ? process.resourcesPath
          : __dirname
      });

      let serverStarted = false;

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        log.info(`Python: ${output}`);
        console.log(`Python Server: ${output}`);
        
        if (!serverStarted && (output.includes('Running on') || output.includes('started'))) {
          serverStarted = true;
          log.info('Python server started successfully');
          resolve(port);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        log.error(`Python Error: ${error}`);
        console.error(`Python Server Error: ${error}`);
      });

      pythonProcess.on('error', (error) => {
        log.error('Failed to start Python server:', error);
        console.error('Failed to start Python server:', error);
        reject(error);
      });

      pythonProcess.on('close', (code) => {
        log.info(`Python server exited with code ${code}`);
        console.log(`Python server exited with code ${code}`);
      });

      // 타임아웃 설정
      setTimeout(() => {
        if (!serverStarted) {
          reject(new Error('Python server startup timeout'));
        }
      }, 60000); // 60초
    }).catch(error => {
      log.error('Failed to find available port:', error);
      reject(error);
    });
  });
}

// 사용 가능한 포트 찾기
async function findAvailablePort(startPort) {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      server.once('close', () => {
        resolve(startPort);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// 메인 윈도우 생성
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // 개발 모드에서는 로컬 서버 사용
  const indexPath = app.isPackaged
    ? `file://${path.join(__dirname, 'index.html')}`
    : `http://localhost:${serverPort}/`;

  // Python 서버가 준비될 때까지 대기
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  // Python 서버 시작
  startPythonServer()
    .then((port) => {
      log.info(`Python server started on port ${port}`);
      console.log(`Python server started on port ${port}`);
      serverPort = port;
      
      // 설정 업데이트
      mainWindow.webContents.executeJavaScript(`
        window.SERVER_PORT = ${port};
        window.API_BASE_URL = 'http://localhost:${port}/api';
      `);
      
      // 메인 페이지 로드
      setTimeout(() => {
        const url = `http://localhost:${port}/login.html`;
        log.info(`Loading main page: ${url}`);
        mainWindow.loadURL(url);
      }, 2000);
    })
    .catch((error) => {
      log.error('Failed to start Python server:', error);
      console.error('Failed to start Python server:', error);
      
      dialog.showErrorBox('서버 시작 실패', 
        `Python 서버를 시작할 수 없습니다.\n${error.message}\n\n로그 파일을 확인하세요:\n${log.transports.file.findLogPath()}`);
      
      // 로그 폴더 열기
      shell.openPath(path.dirname(log.transports.file.findLogPath()));
      
      app.quit();
    });

  // 개발자 도구 (개발 모드에서만)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC 통신 설정
ipcMain.handle('get-hardware-id', () => {
  return machineIdSync();
});

ipcMain.handle('save-config', (event, config) => {
  try {
    // 민감한 정보 암호화
    if (config.apiConfigs) {
      const encrypted = {};
      for (const [phone, apiConfig] of Object.entries(config.apiConfigs)) {
        encrypted[phone] = {
          api_id: encrypt(apiConfig.api_id.toString()),
          api_hash: encrypt(apiConfig.api_hash)
        };
      }
      store.set('apiConfigs', encrypted);
    }
    
    if (config.proxyConfigs) {
      const encrypted = {};
      for (const [phone, proxyConfig] of Object.entries(config.proxyConfigs)) {
        encrypted[phone] = {
          ...proxyConfig,
          username: proxyConfig.username ? encrypt(proxyConfig.username) : null,
          password: proxyConfig.password ? encrypt(proxyConfig.password) : null
        };
      }
      store.set('proxyConfigs', encrypted);
    }
    
    return { success: true };
  } catch (error) {
    log.error('Failed to save config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-config', () => {
  try {
    const config = {
      apiConfigs: {},
      proxyConfigs: {}
    };
    
    // 복호화
    const encryptedApiConfigs = store.get('apiConfigs', {});
    for (const [phone, apiConfig] of Object.entries(encryptedApiConfigs)) {
      config.apiConfigs[phone] = {
        api_id: parseInt(decrypt(apiConfig.api_id)),
        api_hash: decrypt(apiConfig.api_hash)
      };
    }
    
    const encryptedProxyConfigs = store.get('proxyConfigs', {});
    for (const [phone, proxyConfig] of Object.entries(encryptedProxyConfigs)) {
      config.proxyConfigs[phone] = {
        ...proxyConfig,
        username: proxyConfig.username ? decrypt(proxyConfig.username) : null,
        password: proxyConfig.password ? decrypt(proxyConfig.password) : null
      };
    }
    
    return { success: true, config };
  } catch (error) {
    log.error('Failed to load config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-sessions-folder', () => {
  const sessionsPath = path.join(app.getPath('userData'), 'sessions');
  if (!fs.existsSync(sessionsPath)) {
    fs.mkdirSync(sessionsPath, { recursive: true });
  }
  shell.openPath(sessionsPath);
});

ipcMain.handle('open-log-folder', () => {
  shell.openPath(path.dirname(log.transports.file.findLogPath()));
});

// 앱 이벤트
app.whenReady().then(() => {
  log.info('App is ready');
  createWindow();
  
  // 자동 업데이트 설정
  setupAutoUpdater(mainWindow);
});

app.on('window-all-closed', () => {
  // Python 서버 종료
  if (pythonProcess) {
    log.info('Stopping Python server...');
    pythonProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Python 서버 정리
  if (pythonProcess) {
    log.info('Cleaning up Python server...');
    pythonProcess.kill();
  }
});

// IPC 핸들러 - 업데이트 진행률 표시
ipcMain.on('download-progress', (event, progressObj) => {
  if (mainWindow) {
    mainWindow.setProgressBar(progressObj.percent / 100);
  }
});