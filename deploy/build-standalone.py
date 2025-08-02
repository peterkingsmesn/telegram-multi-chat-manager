import os
import sys
import subprocess
import urllib.request
import zipfile
import shutil
import json

def download_file(url, filename):
    """URL에서 파일 다운로드"""
    print(f"Downloading {filename}...")
    urllib.request.urlretrieve(url, filename)
    print(f"Downloaded {filename}")

def setup_python_embed():
    """Python embeddable 패키지 설정"""
    python_embed_dir = "python-embed"
    
    # 디렉토리 생성
    if os.path.exists(python_embed_dir):
        print(f"Removing existing {python_embed_dir}...")
        shutil.rmtree(python_embed_dir)
    
    os.makedirs(python_embed_dir)
    os.chdir(python_embed_dir)
    
    # Python 3.10.11 embeddable 다운로드
    python_url = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip"
    download_file(python_url, "python-embed.zip")
    
    # 압축 해제
    print("Extracting Python...")
    with zipfile.ZipFile("python-embed.zip", 'r') as zip_ref:
        zip_ref.extractall(".")
    os.remove("python-embed.zip")
    
    # get-pip.py 다운로드 및 설치
    print("Installing pip...")
    download_file("https://bootstrap.pypa.io/get-pip.py", "get-pip.py")
    
    # python310._pth 파일 수정 (pip 사용 가능하도록)
    with open("python310._pth", "w") as f:
        f.write("python310.zip\n")
        f.write(".\n")
        f.write(".\Lib\site-packages\n")
        f.write("import site\n")
    
    # pip 설치
    subprocess.run([".\\python.exe", "get-pip.py", "--no-warn-script-location"], check=True)
    os.remove("get-pip.py")
    
    # 필요한 패키지 설치
    print("Installing required packages...")
    packages = [
        "flask",
        "flask-cors",
        "telethon",
        "nest-asyncio",
        "python-socks[asyncio]",
        "python-dotenv",
        "cryptg",
        "pillow",
        "aiofiles",
        "requests"
    ]
    
    for package in packages:
        print(f"Installing {package}...")
        subprocess.run([
            ".\\python.exe", "-m", "pip", "install", 
            "--no-warn-script-location", "--no-cache-dir", package
        ], check=True)
    
    os.chdir("..")
    print("Python embed setup complete!")

def create_server_launcher():
    """서버 실행을 위한 런처 스크립트 생성"""
    launcher_content = '''
import sys
import os
import site

# Python 경로 설정
python_dir = os.path.dirname(sys.executable)
sys.path.insert(0, python_dir)
sys.path.insert(0, os.path.join(python_dir, 'Lib', 'site-packages'))

# 서버 경로 추가
server_dir = os.path.join(os.path.dirname(python_dir), 'server')
sys.path.insert(0, server_dir)

# 환경 변수 설정
os.environ['PYTHONPATH'] = ';'.join(sys.path)
os.environ['FLASK_ENV'] = 'production'
os.environ['ELECTRON_RUN'] = 'true'

# 서버 실행
try:
    os.chdir(server_dir)
    import telegram_server
except Exception as e:
    print(f"Error starting server: {e}")
    import traceback
    traceback.print_exc()
    input("Press Enter to exit...")
'''
    
    with open("python-embed/run_server.py", "w") as f:
        f.write(launcher_content)
    
    print("Server launcher created!")

def update_main_js():
    """main.js를 포함된 Python 사용하도록 수정"""
    main_js_content = '''const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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
''' + open('main.js', 'r', encoding='utf-8').read().split('// 나머지 코드는 동일...')[0].split('// Python 서버 시작')[1]
    
    # main.js 백업
    shutil.copy('main.js', 'main.js.backup')
    
    # 새 main.js 작성
    with open('main.js', 'w', encoding='utf-8') as f:
        f.write(main_js_content)
    
    print("main.js updated!")

def update_package_json():
    """package.json 수정"""
    with open('package.json', 'r', encoding='utf-8') as f:
        package = json.load(f)
    
    # extraResources 수정
    package['build']['extraResources'] = [
        {
            "from": "python-embed",
            "to": "python",
            "filter": ["**/*"]
        },
        {
            "from": "server",
            "to": "server",
            "filter": ["**/*.py", "**/*.json", "requirements.txt"]
        }
    ]
    
    # 새 스크립트 추가
    package['scripts']['build-standalone'] = "python build-standalone.py && npm run dist-win-simple"
    
    with open('package.json', 'w', encoding='utf-8') as f:
        json.dump(package, f, indent=2)
    
    print("package.json updated!")

def main():
    print("=== Building Standalone Electron App ===")
    
    # 1. Python embeddable 설정
    print("\n1. Setting up Python embeddable...")
    setup_python_embed()
    
    # 2. 서버 런처 생성
    print("\n2. Creating server launcher...")
    create_server_launcher()
    
    # 3. main.js 수정
    print("\n3. Updating main.js...")
    update_main_js()
    
    # 4. package.json 수정
    print("\n4. Updating package.json...")
    update_package_json()
    
    print("\n=== Setup Complete! ===")
    print("Now run: npm run dist-win-simple")

if __name__ == "__main__":
    main()