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

    // Python 실행 파일 확인
    if (!fs.existsSync(pythonPath)) {
      reject(new Error(`Python not found at: ${pythonPath}`));
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
        PYTHONUNBUFFERED: '1'
      };

      // 보안 설정 추가
      if (store.has('licenseKey')) {
        env.LICENSE_KEY = decrypt(store.get('licenseKey'));
      }

      console.log(`Starting Python server with: ${pythonPath} ${serverScript}`);
      
      pythonProcess = spawn(pythonPath, [serverScript], {
        env,
        windowsHide: true
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log(`Python Server: ${data}`);
        if (data.toString().includes('Running on') || data.toString().includes('started')) {
          resolve(port);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Server Error: ${data}`);
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python server:', error);
        reject(error);
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python server exited with code ${code}`);
        if (code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // 타임아웃 설정
      setTimeout(() => {
        reject(new Error('Python server startup timeout'));
      }, 60000); // 60초로 증가 (첫 실행 시 패키지 로딩 시간)
    });
  });
}

// 나머지 코드는 동일...

async function startPythonServer() {
  try {
    // Python Manager 초기화
    await pythonManager.initialize();
    
    // 사용 가능한 포트 찾기
    const port = await findAvailablePort(serverPort);
    serverPort = port;
    
    // 환경 변수 설정
    process.env.SECRET_KEY = crypto.randomBytes(32).toString('hex');
    process.env.SERVER_PORT = port.toString();
    
    // 보안 설정 추가
    if (store.has('licenseKey')) {
      process.env.LICENSE_KEY = decrypt(store.get('licenseKey'));
    }
    
    