const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
// electron-store 기반 서비스 가져오기
const TaskStoreService = require('./src/services/store');

// 빌드를 위해 SQLite 초기화 부분 임시 주석 처리
// const { initDatabase, tasksDb } = require('./src/db/db');

// 한글 깨짐 방지를 위한 콘솔 인코딩 설정
if (process.platform === 'win32') {
  process.env.LANG = 'ko_KR.UTF-8';
  // 콘솔 코드 페이지를 UTF-8로 변경 (Windows에서만 필요)
  const { execSync } = require('child_process');
  try {
    execSync('chcp 65001');
    console.log('콘솔 인코딩을 UTF-8로 설정했습니다.');
  } catch (error) {
    console.error('콘솔 인코딩 설정 실패:', error.message);
  }
}

// 콘솔 로그 래퍼 함수 - 한글 로그가 깨지는 문제 방지
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  if (process.platform === 'win32') {
    // Windows에서는 Buffer를 사용하여 로그 출력
    args.forEach(arg => {
      if (typeof arg === 'string') {
        process.stdout.write(Buffer.from(arg + '\n', 'utf8'));
      } else {
        originalConsoleLog(arg);
      }
    });
  } else {
    originalConsoleLog(...args);
  }
};

console.error = function(...args) {
  if (process.platform === 'win32') {
    // Windows에서는 Buffer를 사용하여 로그 출력
    args.forEach(arg => {
      if (typeof arg === 'string') {
        process.stderr.write(Buffer.from(arg + '\n', 'utf8'));
      } else {
        originalConsoleError(arg);
      }
    });
  } else {
    originalConsoleError(...args);
  }
};

// 개발 중인지 여부 체크
const isDev = process.env.NODE_ENV === 'development';

// 메인 윈도우 참조를 유지
let mainWindow;
// 데이터베이스 초기화
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 개발 모드에서는 React 개발 서버 사용, 배포 모드에서는 index.html 파일 직접 로드
  let startUrl;
  if (isDev) {
    startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'index.html')}`;
  } else {
    startUrl = `file://${path.join(__dirname, 'index.html')}`;
  }
  
  console.log('앱 시작 URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // 개발 도구 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  try {
    // 윈도우 생성 및 IPC 핸들러 설정
    createWindow();
    setupIpcHandlers();
    console.log('애플리케이션이 준비되었습니다.');
  } catch (err) {
    console.error('애플리케이션 초기화 오류:', err);
  }
});

// 모든 창이 닫힐 때 앱 종료 (macOS 제외)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // macOS에서는 앱 아이콘을 클릭하면 창을 다시 생성
  if (mainWindow === null) createWindow();
});

// IPC 핸들러 설정
function setupIpcHandlers() {
  // 모든 task 가져오기
  ipcMain.handle('get-all-tasks', async (event) => {
    try {
      const tasks = TaskStoreService.getAllTasks();
      console.log(`${tasks.length}개 작업을 불러왔습니다.`);
      return tasks;
    } catch (error) {
      console.error('작업 불러오기 오류:', error);
      throw error;
    }
  });

  // 새 task 추가
  ipcMain.handle('add-task', async (event, task) => {
    try {
      const newTask = TaskStoreService.addTask(task);
      console.log('새 작업이 추가되었습니다:', newTask.title);
      return newTask;
    } catch (error) {
      console.error('작업 추가 오류:', error);
      throw error;
    }
  });

  // task 업데이트
  ipcMain.handle('update-task', async (event, task) => {
    try {
      const updatedTask = TaskStoreService.updateTask(task);
      console.log('작업이 업데이트되었습니다:', updatedTask.title);
      return updatedTask;
    } catch (error) {
      console.error('작업 업데이트 오류:', error);
      throw error;
    }
  });

  // task 삭제
  ipcMain.handle('delete-task', async (event, id) => {
    try {
      const deletedId = TaskStoreService.deleteTask(id);
      console.log('작업이 삭제되었습니다, ID:', deletedId);
      return deletedId;
    } catch (error) {
      console.error('작업 삭제 오류:', error);
      throw error;
    }
  });
} 