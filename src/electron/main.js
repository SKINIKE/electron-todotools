const { app, BrowserWindow, ipcMain, dialog, crashReporter, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { parse, unparse } = require('papaparse');
const chcp = require('child_process');
const { exec } = require('child_process');
const os = require('os');

// 한글 인코딩 문제 해결을 위한 설정
try {
  // Windows에서 콘솔 코드 페이지를 UTF-8로 변경
  if (process.platform === 'win32') {
    chcp.execSync('chcp 65001');
    console.log('콘솔 코드 페이지를 UTF-8(65001)로 설정했습니다.');
  }
} catch (e) {
  console.error('콘솔 인코딩 설정 중 오류 발생:', e);
}

// 크래시 리포터 설정
crashReporter.start({
  productName: '할 일 관리 앱',
  companyName: '개인 프로젝트',
  submitURL: 'https://your-domain.com/crash-report', // 실제 제출 URL로 변경 필요
  uploadToServer: false // 개발 중에는 서버 업로드 비활성화
});

let mainWindow;

// 애플리케이션 설정 저장 경로
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

// 로깅 함수
const logMessage = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  console.log(formattedMessage);
  
  // 메인 윈도우가 준비되었으면 렌더러에도 로그 전송
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('log-message', { type, message, timestamp });
    } catch (err) {
      console.error('로그 전송 오류:', err);
    }
  }
  
  return { success: true };
};

// 에러 처리 함수
const handleError = (error, source = 'Main Process') => {
  const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
  logMessage(`${source} 에러: ${errorMessage}`, 'error');
  
  // 메인 윈도우가 준비되었으면 에러 메시지 전송
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('error-occurred', {
        message: errorMessage,
        source: source,
        stack: error instanceof Error ? error.stack : '',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('오류 전송 실패:', err);
    }
  }
  
  return { success: false, error: errorMessage };
};

// 설정 불러오기
const loadSettings = () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      logMessage('설정을 성공적으로 로드했습니다');
      return { ...settings };
    } else {
      logMessage('설정 파일이 없어 기본 설정을 사용합니다');
      const defaultSettings = {
        theme: 'light',
        language: 'ko',
        dataDirectory: app.getPath('documents')
      };
      saveSettings(defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    handleError(error, '설정 로드');
    return {
      theme: 'light',
      language: 'ko',
      dataDirectory: app.getPath('documents')
    };
  }
};

// 설정 저장하기
const saveSettings = (settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    logMessage('설정을 성공적으로 저장했습니다');
    return { success: true };
  } catch (error) {
    handleError(error, '설정 저장');
    return { success: false, error: error.message };
  }
};

// 예외 처리 이벤트 리스너
process.on('uncaughtException', (error) => {
  handleError(error, '예외 처리되지 않음');
});

// 거부된 프라미스 처리 이벤트 리스너
process.on('unhandledRejection', (reason) => {
  handleError(reason, '처리되지 않은 프라미스 거부');
});

function createWindow() {
  logMessage('메인 윈도우 생성 시작...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 개발자 도구 열기
  mainWindow.webContents.openDevTools();

  // 개발 모드에서는 로컬 서버를 사용하고, 프로덕션에서는 빌드된 파일을 로드
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../../build/index.html'),
    protocol: 'file:',
    slashes: true
  });

  logMessage(`로드할 URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  // 앱 로딩 진행 상황
  mainWindow.webContents.on('did-start-loading', () => {
    logMessage('페이지 로딩 시작...');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logMessage('페이지 로딩 완료');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    handleError(`페이지 로딩 실패: (${errorCode}) ${errorDescription}`, '페이지 로딩');
  });

  // 렌더러 프로세스 충돌 감지
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    handleError(`렌더러 프로세스 종료됨: 사유: ${details.reason}, 종료 코드: ${details.exitCode}`, '렌더러 종료');
  });

  mainWindow.webContents.on('crashed', () => {
    handleError('렌더러 프로세스가 충돌했습니다', '렌더러 충돌');
    
    // 앱 재시작 확인 다이얼로그
    dialog.showMessageBox({
      type: 'error',
      title: '앱 오류',
      message: '앱이 비정상적으로 종료되었습니다. 다시 시작하시겠습니까?',
      buttons: ['예', '아니오'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        app.relaunch();
        app.exit(0);
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  logMessage('앱이 준비되었습니다');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC 핸들러 설정
logMessage('IPC 핸들러 등록 시작...');

// 로그 메시지 처리
ipcMain.handle('log-message', (event, { type, message }) => {
  return logMessage(message, type);
});

// 앱 경로 반환
ipcMain.handle('get-app-path', async () => {
  try {
    return { success: true, path: app.getAppPath() };
  } catch (error) {
    return handleError(error, 'get-app-path 처리 중');
  }
});

// 시스템 경로 반환
ipcMain.handle('get-path', async (event, name) => {
  try {
    return { success: true, path: app.getPath(name) };
  } catch (error) {
    return handleError(error, `get-path(${name}) 처리 중`);
  }
});

// 디렉토리 선택 대화상자
ipcMain.handle('select-directory', async () => {
  try {
    if (!mainWindow) {
      throw new Error('메인 윈도우가 없습니다');
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: '디렉토리 선택'
    });
    
    return {
      success: !result.canceled,
      canceled: result.canceled,
      filePaths: result.filePaths
    };
  } catch (error) {
    return handleError(error, 'select-directory 처리 중');
  }
});

// 저장 대화상자
ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    if (!mainWindow) {
      throw new Error('메인 윈도우가 없습니다');
    }
    
    const result = await dialog.showSaveDialog(mainWindow, {
      ...options,
      title: options.title || '파일 저장',
      buttonLabel: options.buttonLabel || '저장'
    });
    
    return {
      success: !result.canceled,
      canceled: result.canceled,
      filePath: result.filePath
    };
  } catch (error) {
    return handleError(error, 'show-save-dialog 처리 중');
  }
});

// 파일 열기 대화상자
ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    if (!mainWindow) {
      throw new Error('메인 윈도우가 없습니다');
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      ...options,
      title: options.title || '파일 열기',
      buttonLabel: options.buttonLabel || '열기'
    });
    
    return {
      success: !result.canceled,
      canceled: result.canceled,
      filePaths: result.filePaths
    };
  } catch (error) {
    return handleError(error, 'show-open-dialog 처리 중');
  }
});

// 디렉토리 존재 확인 및 생성
ipcMain.handle('ensure-directory-exists', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logMessage(`디렉토리 생성됨: ${dirPath}`);
    }
    
    // 읽기/쓰기 권한 확인
    try {
      fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
      return { success: true, path: dirPath };
    } catch (accessError) {
      throw new Error(`디렉토리 ${dirPath}에 대한 읽기/쓰기 권한이 없습니다`);
    }
  } catch (error) {
    return handleError(error, 'ensure-directory-exists 처리 중');
  }
});

// 데이터 내보내기
ipcMain.handle('export-data', async (event, { data, filePath }) => {
  try {
    // CSV 변환
    const csv = unparse(data);
    
    // 파일 쓰기
    fs.writeFileSync(filePath, csv, 'utf8');
    
    logMessage(`데이터가 성공적으로 내보내기 되었습니다: ${filePath}`);
    return { success: true, filePath };
  } catch (error) {
    return handleError(error, 'export-data 처리 중');
  }
});

// 데이터 가져오기
ipcMain.handle('import-data', async (event, { filePath, backupPath, currentData }) => {
  try {
    // 백업 생성 (현재 데이터가 있는 경우)
    if (currentData && currentData.length > 0 && backupPath) {
      const backupCsv = unparse(currentData);
      fs.writeFileSync(backupPath, backupCsv, 'utf8');
      logMessage(`기존 데이터 백업 생성: ${backupPath}`);
    }
    
    // CSV 파일 읽기
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // CSV 파싱
    const parseResult = parse(fileContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      throw new Error(`CSV 파싱 오류: ${parseResult.errors[0].message}`);
    }
    
    logMessage(`${parseResult.data.length}개의 항목을 가져왔습니다`);
    return {
      success: true,
      data: parseResult.data
    };
  } catch (error) {
    return handleError(error, 'import-data 처리 중');
  }
});

// 다크 모드 토글 처리
ipcMain.handle('toggle-dark-mode', async (event, isDarkMode) => {
  try {
    logMessage(`다크 모드 ${isDarkMode ? '활성화' : '비활성화'}`);
    // 여기서 필요한 경우 시스템 설정을 변경할 수 있습니다.
    // 예: nativeTheme.themeSource = isDarkMode ? 'dark' : 'light';
    
    const settings = loadSettings();
    settings.theme = isDarkMode ? 'dark' : 'light';
    saveSettings(settings);
    
    // 창이 있으면 상태 업데이트
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dark-mode-changed', settings.theme);
    }
    
    return { success: true, isDarkMode };
  } catch (error) {
    return handleError(error, 'toggle-dark-mode 처리 중');
  }
});

// 설정 가져오기
ipcMain.handle('get-settings', async () => {
  try {
    const settings = loadSettings();
    return { success: true, settings };
  } catch (error) {
    return handleError(error, 'get-settings 처리 중');
  }
});

// 설정 저장
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const currentSettings = loadSettings();
    const newSettings = { ...currentSettings, ...settings };
    const success = saveSettings(newSettings);
    
    return { success, settings: newSettings };
  } catch (error) {
    return handleError(error, 'save-settings 처리 중');
  }
});

logMessage('모든 IPC 핸들러가 등록되었습니다'); 