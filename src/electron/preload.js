const { contextBridge, ipcRenderer } = require('electron');

// 디버깅을 위한 로깅
console.log('일렉트론 프리로드 스크립트가 로드되었습니다.');

// 유효한 채널 목록 정의
const validChannels = [
  'log-message',
  'error-occurred',
  'get-app-path',
  'get-path',
  'select-directory',
  'show-save-dialog',
  'show-open-dialog',
  'ensure-directory-exists',
  'export-data',
  'import-data',
  'toggle-dark-mode',
  'dark-mode-changed',
  'get-settings',
  'save-settings'
];

// safe-wrapper 함수 - 오류 발생 시 안전하게 처리
const safeIpc = (fn) => {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('IPC 호출 오류:', error);
      return Promise.resolve({ success: false, error: error.message });
    }
  };
};

// API 정의
const api = {
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
  
  // 이벤트 수신 (렌더러 -> 메인)
  invoke: safeIpc((channel, data) => {
    if (!validChannels.includes(channel)) {
      console.error(`유효하지 않은 채널에 대한 invoke 호출: ${channel}`);
      return Promise.resolve({ success: false, error: '유효하지 않은 채널' });
    }
    return ipcRenderer.invoke(channel, data);
  }),
  
  // 이벤트 구독 (메인 -> 렌더러)
  on: safeIpc((channel, callback) => {
    if (!validChannels.includes(channel)) {
      console.error(`유효하지 않은 채널에 대한 on 호출: ${channel}`);
      return;
    }
    
    // 이벤트 래퍼
    const subscription = (event, ...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`채널 ${channel}의 콜백 실행 중 오류:`, error);
      }
    };
    
    // 이벤트 리스너 등록
    ipcRenderer.on(channel, subscription);
    
    // 구독 취소 함수 반환
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  }),
  
  // 한 번만 이벤트 수신 (메인 -> 렌더러)
  once: safeIpc((channel, callback) => {
    if (!validChannels.includes(channel)) {
      console.error(`유효하지 않은 채널에 대한 once 호출: ${channel}`);
      return;
    }
    
    // 이벤트 래퍼
    const wrappedCallback = (...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`채널 ${channel}의 콜백 실행 중 오류:`, error);
      }
    };
    
    ipcRenderer.once(channel, wrappedCallback);
  }),
  
  // 로깅 헬퍼
  log: safeIpc((message, type = 'info') => {
    return ipcRenderer.invoke('log-message', { type, message });
  })
};

// API를 렌더러 프로세스에 노출
try {
  contextBridge.exposeInMainWorld('electron', api);
  console.log('일렉트론 API가 성공적으로 노출되었습니다');
} catch (error) {
  console.error('일렉트론 API 노출 실패:', error);
} 