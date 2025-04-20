import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 디버깅 로그 추가
console.log('React 앱 시작: index.js 로드됨');

// 앱 마운트 함수 정의
function mountApp() {
  console.log('마운트 시도 중...');
  const rootElement = document.getElementById('root');
  console.log('root 요소 찾기: ', rootElement);
  
  if (rootElement) {
    console.log('root 요소 찾음, React 마운트 시도');
    try {
      // React 18 방식으로 마운트
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('React 마운트 성공');
      
      // Electron API 확인
      if (window.electronAPI) {
        try {
          window.electronAPI.logMessage('React 앱이 성공적으로 마운트되었습니다.');
        } catch (err) {
          console.warn('Electron API 로그 전송 실패:', err);
        }
      } else {
        console.warn('electronAPI를 찾을 수 없습니다. 일부 기능이 작동하지 않을 수 있습니다.');
      }
    } catch (error) {
      console.error('React 마운트 오류:', error);
      showError('React 마운트 오류: ' + error.message);
    }
  } else {
    const errorMsg = 'root 요소를 찾을 수 없음. HTML에 id="root" 요소가 있는지 확인하세요.';
    console.error(errorMsg);
    showError(errorMsg);
  }
}

// 오류 메시지 표시 함수
function showError(message) {
  console.error('오류 발생:', message);
  
  // 기존 오류 요소 확인
  let errorElement = document.getElementById('error-info');
  
  // 없으면 생성
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = 'error-info';
    errorElement.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:9999;';
    document.body.prepend(errorElement);
  }
  
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

// DOM이 완전히 로드된 후 렌더링 시도
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  // 이미 DOM이 로드된 경우 즉시 마운트
  mountApp();
} 