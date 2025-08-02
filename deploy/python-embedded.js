const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class PythonManager {
  constructor() {
    this.pythonProcess = null;
    this.pythonPath = null;
    this.serverPath = null;
    this.isReady = false;
  }

  async initialize() {
    // Python 경로 설정
    if (app.isPackaged) {
      // 패키징된 앱에서는 포함된 Python 사용
      this.pythonPath = path.join(process.resourcesPath, 'python', 'python.exe');
      this.serverPath = path.join(process.resourcesPath, 'server');
    } else {
      // 개발 모드에서는 시스템 Python 사용
      this.pythonPath = 'python';
      this.serverPath = path.join(__dirname, 'server');
    }

    // 서버 디렉토리 확인
    if (!fs.existsSync(this.serverPath)) {
      throw new Error(`Server directory not found: ${this.serverPath}`);
    }

    return true;
  }

  async startServer(port = 5555) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        FLASK_ENV: 'production',
        PYTHONUNBUFFERED: '1',
        SERVER_PORT: port.toString(),
        ELECTRON_RUN: 'true'
      };

      const serverScript = path.join(this.serverPath, 'telegram_server.py');
      
      // Python 프로세스 시작
      this.pythonProcess = spawn(this.pythonPath, [serverScript], {
        env,
        cwd: this.serverPath,
        windowsHide: true
      });

      let startupTimeout = setTimeout(() => {
        reject(new Error('Python server startup timeout'));
      }, 30000);

      this.pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Python: ${output}`);
        
        if (output.includes('Running on') || output.includes('started')) {
          clearTimeout(startupTimeout);
          this.isReady = true;
          resolve(port);
        }
      });

      this.pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
      });

      this.pythonProcess.on('error', (error) => {
        clearTimeout(startupTimeout);
        reject(error);
      });

      this.pythonProcess.on('close', (code) => {
        this.isReady = false;
        if (code !== 0) {
          console.error(`Python server exited with code ${code}`);
        }
      });
    });
  }

  stopServer() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isReady = false;
    }
  }

  async installDependencies() {
    // 패키징된 앱에서는 이미 설치됨
    if (app.isPackaged) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const requirementsPath = path.join(this.serverPath, 'requirements.txt');
      
      const pip = spawn(this.pythonPath, [
        '-m', 'pip', 'install', '-r', requirementsPath
      ], {
        cwd: this.serverPath
      });

      pip.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`pip install failed with code ${code}`));
        }
      });
    });
  }
}

module.exports = PythonManager;