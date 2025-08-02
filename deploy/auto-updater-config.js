// 자동 업데이트 설정
const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');
const log = require('electron-log');

// 로깅 설정
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

// 업데이트 설정
const setupAutoUpdater = (mainWindow) => {
  // 개발 환경에서는 업데이트 체크 안함
  if (!app.isPackaged) {
    return;
  }

  // 업데이트 서버 설정
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'yourcompany',
    repo: 'telegram-manager',
    private: false,
    token: process.env.GH_TOKEN // GitHub 토큰 (private repo의 경우)
  });

  // 대체 업데이트 서버 (자체 호스팅)
  // autoUpdater.setFeedURL({
  //   provider: 'generic',
  //   url: 'https://your-update-server.com/releases/'
  // });

  // 자동 다운로드 활성화
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // 업데이트 이벤트 핸들러
  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('업데이트 발견:', info);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '업데이트 알림',
      message: '새로운 버전이 있습니다!',
      detail: `현재 버전: ${app.getVersion()}\n새 버전: ${info.version}\n\n업데이트를 다운로드하시겠습니까?`,
      buttons: ['다운로드', '나중에'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('현재 최신 버전입니다.');
  });

  autoUpdater.on('error', (err) => {
    log.error('업데이트 오류:', err);
    
    dialog.showErrorBox(
      '업데이트 오류',
      `업데이트 중 오류가 발생했습니다:\n${err.message}`
    );
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "다운로드 속도: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - 다운로드 ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);

    // 메인 윈도우에 진행률 전송
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('업데이트 다운로드 완료');
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '업데이트 준비 완료',
      message: '업데이트가 다운로드되었습니다.',
      detail: `버전 ${info.version}이 다운로드되었습니다.\n\n지금 재시작하여 업데이트를 적용하시겠습니까?`,
      buttons: ['재시작', '나중에'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 앱 시작 시 업데이트 체크
  app.whenReady().then(() => {
    // 3초 후에 업데이트 체크 (앱이 완전히 로드된 후)
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  });

  // 주기적으로 업데이트 체크 (1시간마다)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);
};

module.exports = { setupAutoUpdater };