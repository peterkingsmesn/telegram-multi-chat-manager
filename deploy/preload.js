const { contextBridge, ipcRenderer } = require('electron');

// 보안을 위해 제한된 API만 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 하드웨어 ID 가져오기
  getHardwareId: () => ipcRenderer.invoke('get-hardware-id'),
  
  // 설정 저장/불러오기
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  
  // 세션 폴더 열기
  openSessionsFolder: () => ipcRenderer.invoke('open-sessions-folder'),
  
  // 앱 정보
  getAppInfo: () => ({
    version: process.versions.electron,
    platform: process.platform,
    arch: process.arch
  })
});

// 전역 변수 설정 (서버 포트 등)
window.addEventListener('DOMContentLoaded', () => {
  // Electron 환경임을 표시
  window.IS_ELECTRON = true;
  
  // 기본 서버 설정 (main.js에서 업데이트됨)
  window.SERVER_PORT = 5555;
  window.API_BASE_URL = `http://localhost:${window.SERVER_PORT}/api`;
});