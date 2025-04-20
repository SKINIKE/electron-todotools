// preload.js
console.log('Preload 스크립트 로드됨');

// Electron 모듈 가져오기
const { contextBridge, ipcRenderer } = require('electron');

// 안전한 IPC 호출 함수
function safeIpcInvoke(channel, ...args) {
  try {
    return ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`IPC 호출 오류 (${channel}):`, error);
    return Promise.reject(error);
  }
}

// React 앱에서 접근할 수 있도록 API 노출
try {
  // contextBridge API를 통해 렌더러 프로세스에 안전하게 노출할 함수 정의
  contextBridge.exposeInMainWorld('electronAPI', {
    // 로그 메시지 전송
    logMessage: (message) => safeIpcInvoke('log-message', message),
    
    // 작업 관련 API
    getAllTasks: () => safeIpcInvoke('get-all-tasks'),
    addTask: (task) => safeIpcInvoke('add-task', task),
    updateTask: (task) => safeIpcInvoke('update-task', task),
    deleteTask: (id) => safeIpcInvoke('delete-task', id),
    
    // 시스템 경로 관련 API
    getAppPath: () => safeIpcInvoke('get-app-path'),
    getPath: (name) => safeIpcInvoke('get-path', name),
    selectDirectory: () => safeIpcInvoke('select-directory'),
    
    // 파일 대화상자 관련 API
    showSaveDialog: (options) => safeIpcInvoke('show-save-dialog', options),
    showOpenDialog: (options) => safeIpcInvoke('show-open-dialog', options),
    
    // 디렉토리 및 파일 관련 API
    ensureDirectoryExists: (dirPath) => safeIpcInvoke('ensure-directory-exists', dirPath),
    
    // 데이터 가져오기/내보내기 API
    exportData: (exportPath) => safeIpcInvoke('export-data', exportPath),
    importData: (importPath) => safeIpcInvoke('import-data', importPath),
    
    // 설정 관련 API
    getSettings: () => safeIpcInvoke('get-settings'),
    saveSettings: (settings) => safeIpcInvoke('save-settings', settings),
    
    // 이벤트 구독
    onThemeChanged: (callback) => {
      try {
        console.log('테마 변경 이벤트 구독 설정');
        const subscription = (event, theme) => {
          console.log('테마 변경 이벤트 수신:', theme);
          callback(theme);
        };
        
        ipcRenderer.on('theme-changed', subscription);
        
        return () => {
          console.log('테마 변경 이벤트 구독 해제');
          ipcRenderer.removeListener('theme-changed', subscription);
        };
      } catch (error) {
        console.error('테마 변경 이벤트 구독 오류:', error);
      }
    }
  });
  
  console.log('Electron API가 성공적으로 노출되었습니다.');
} catch (error) {
  console.error('Electron API 노출 중 오류 발생:', error);
}

// DOM 로드 이벤트 처리
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload: DOM이 로드됨');
  
  // 콘텐츠 로드 확인
  const rootElement = document.getElementById('root');
  console.log('Preload: root 요소 찾음:', rootElement);
  
  // 로딩 문제 확인을 위한 추가 확인
  if (rootElement) {
    console.log('Preload: root 내부 내용:', rootElement.innerHTML);
    
    // 앱 로딩 시작 알림
    try {
      safeIpcInvoke('log-message', 'React 앱 로딩 시작');
    } catch (error) {
      console.error('IPC 메시지 전송 중 오류:', error);
    }
  }
});

// 전역 오류 처리기 추가
window.addEventListener('error', (event) => {
  console.error('Preload: 페이지 오류 감지:', event.error, event.message);
  try {
    safeIpcInvoke('log-message', `오류: ${event.message}`);
  } catch (error) {
    console.error('오류 로그 전송 중 실패:', error);
  }
});

console.log('Preload 스크립트 실행 완료'); 