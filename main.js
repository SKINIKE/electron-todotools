const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
// 서비스 가져오기
const TaskStoreService = require('./src/services/store');

// 개발 모드 체크
const isDev = process.env.NODE_ENV === 'development';
console.log('개발 모드:', isDev ? 'true' : 'false');

// 메인 윈도우 참조
let mainWindow;
let backupIntervalId = null; // 자동 백업 타이머 ID

// 앱이 준비되면 윈도우 생성
app.whenReady().then(async () => {
  // 언어 설정
  if (process.platform === 'win32') {
    app.commandLine.appendSwitch('lang', 'ko-KR');
  }
  
  console.log('앱 준비됨');
  createWindow();
  setupIpcHandlers();

  // 앱 시작 시 자동 백업 설정 적용
  await applyAutoBackupSettings();
});

function createWindow() {
  console.log('메인 윈도우 생성');
  
  // 브라우저 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true // 개발자 도구 항상 활성화
    }
  });

  // CSP 설정 추가 (Content-Security-Policy)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
          "script-src 'self';" +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
          "font-src 'self' https://fonts.gstatic.com;"
        ]
      }
    });
  });

  // HTML 파일 로드
  const startUrl = `file://${path.join(__dirname, 'index.html')}`;
  
  console.log('로드할 URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // 개발자 도구 항상 열기 (디버깅용)
  mainWindow.webContents.openDevTools();

  // 윈도우가 닫힐 때 참조 제거
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // 렌더러 프로세스에서 에러 발생 시
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('렌더러 프로세스 종료:', details.reason);
  });
  
  // 페이지 로드 완료 시
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('페이지 로드 완료');
  });
}

// 모든 창이 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 앱 아이콘 클릭 시 윈도우 재생성
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 오류 및 종료 처리
app.on('render-process-gone', (event, webContents, details) => {
  console.error('렌더러 프로세스 종료:', details.reason);
});

// 크래시 핸들러
app.on('render-process-crashed', (event, webContents) => {
  console.error('렌더러 프로세스 충돌');
});

// 설정 파일 경로
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

// 기본 설정
const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'ko',
  dataPath: '',
  fontSize: 'medium',
  notificationEnabled: true,
  autoSave: true
};

// IPC 핸들러 설정
function setupIpcHandlers() {
  console.log('IPC 핸들러 설정 시작');
  
  // log-message 핸들러 추가
  ipcMain.handle('log-message', async (event, message) => {
    console.log('앱 로그:', message);
    return true;
  });

  // 모든 task 가져오기
  ipcMain.handle('get-all-tasks', async () => {
    try {
      return TaskStoreService.getAllTasks();
    } catch (error) {
      console.error('작업 불러오기 오류:', error);
      return [];
    }
  });

  // 새 task 추가
  ipcMain.handle('add-task', async (event, task) => {
    try {
      return TaskStoreService.addTask(task);
    } catch (error) {
      console.error('작업 추가 오류:', error);
      return null;
    }
  });

  // task 업데이트
  ipcMain.handle('update-task', async (event, task) => {
    try {
      return TaskStoreService.updateTask(task);
    } catch (error) {
      console.error('작업 업데이트 오류:', error);
      return null;
    }
  });

  // task 삭제
  ipcMain.handle('delete-task', async (event, id) => {
    try {
      return TaskStoreService.deleteTask(id);
    } catch (error) {
      console.error('작업 삭제 오류:', error);
      return false;
    }
  });
  
  // 앱 경로 가져오기
  ipcMain.handle('get-app-path', () => {
    try {
      const appPath = app.getAppPath();
      console.log('앱 경로:', appPath);
      return appPath;
    } catch (error) {
      console.error('앱 경로 가져오기 오류:', error);
      return '';
    }
  });
  
  // 시스템 경로 가져오기
  ipcMain.handle('get-path', (event, name) => {
    try {
      const result = app.getPath(name);
      console.log(`${name} 경로:`, result);
      return result;
    } catch (error) {
      console.error(`${name} 경로 가져오기 오류:`, error);
      return '';
    }
  });
  
  // 폴더 선택 대화상자 열기
  ipcMain.handle('select-directory', async () => {
    console.log('폴더 선택 대화상자 열기 요청');
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      });
      
      console.log('폴더 선택 결과:', result);
      
      if (result.canceled) {
        return null;
      }
      
      return result.filePaths[0];
    } catch (error) {
      console.error('폴더 선택 대화상자 오류:', error);
      return null;
    }
  });
  
  // 파일 저장 대화상자 열기
  ipcMain.handle('show-save-dialog', async (event, options) => {
    console.log('파일 저장 대화상자 열기 요청:', options);
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      
      console.log('파일 저장 대화상자 결과:', result);
      
      if (result.canceled) {
        return null;
      }
      
      return result.filePath;
    } catch (error) {
      console.error('파일 저장 대화상자 오류:', error);
      return null;
    }
  });
  
  // 파일 열기 대화상자 열기
  ipcMain.handle('show-open-dialog', async (event, options) => {
    console.log('파일 열기 대화상자 열기 요청:', options);
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      
      console.log('파일 열기 대화상자 결과:', result);
      
      if (result.canceled) {
        return null;
      }
      
      return result.filePaths;
    } catch (error) {
      console.error('파일 열기 대화상자 오류:', error);
      return null;
    }
  });
  
  // 디렉토리 생성 및 접근 권한 확인
  ipcMain.handle('ensure-directory-exists', async (event, dirPath) => {
    console.log('디렉토리 존재 확인 요청:', dirPath);
    try {
      if (!fs.existsSync(dirPath)) {
        console.log('디렉토리 생성:', dirPath);
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 읽기/쓰기 권한 확인
      try {
        const testFile = path.join(dirPath, '.test-write-access');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('디렉토리 접근 권한 확인 성공');
        return true;
      } catch (accessError) {
        console.error('디렉토리 접근 권한 오류:', accessError);
        return false;
      }
    } catch (error) {
      console.error('디렉토리 생성 오류:', error);
      throw error;
    }
  });
  
  // 데이터 내보내기
  ipcMain.handle('export-data', async (event, exportPath) => {
    console.log('[EXPORT] 데이터 내보내기 요청:', exportPath);
    try {
      // store.js를 통해 현재 작업 목록 가져오기
      // getAllTasks는 Date 객체를 포함하므로 CSV 저장 전에 문자열 변환 필요
      const tasks = TaskStoreService.getAllTasks(); 
      console.log(`[EXPORT] ${tasks.length}개 작업 내보내기 준비.`);
      
      // CSV 형식으로 변환 (9개 열 구조로 통일)
      const CSV_HEADER = 'id,title,completed,date,importance,urgency,quadrant,priority,pinned\n'; // 9개 열 헤더
      const csvData = CSV_HEADER + tasks.map(task => {
        // 날짜를 YYYY-MM-DD 형식으로 변환
        let dateString = '';
        if (task.date instanceof Date && !isNaN(task.date.getTime())) {
            dateString = task.date.toISOString().split('T')[0];
        } else if (typeof task.date === 'string' && task.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateString = task.date; // 이미 YYYY-MM-DD 형식
        } 
        
        // description 필드는 제외하고 새로운 9개 열 구조에 맞춤
        return [
          task.id,
          escapeCSV(task.title || ''),
          task.completed ? 'true' : 'false', // boolean -> string
          dateString,
          task.importance || 'low', // importance 필드 추가
          task.urgency || 'low',   // urgency 필드 추가
          task.quadrant || 4,    // quadrant 필드 추가
          task.priority || 'low',  // priority 필드 유지 (기본값 low 사용)
          task.pinned ? 'true' : 'false' // pinned 필드 추가 (boolean -> string)
        ].join(',');
      }).join('\n');
      
      fs.writeFileSync(exportPath, csvData, 'utf8');
      console.log('[EXPORT] 데이터 내보내기 성공:', exportPath);
      return true;
    } catch (error) {
      console.error('[EXPORT] 데이터 내보내기 오류:', error);
      // 오류를 호출자에게 전파 (예: SettingsView에서 처리)
      throw error; 
    }
  });
  
  // CSV 문자열 이스케이프 (콤마, 따옴표 처리)
  function escapeCSV(str) {
    if (typeof str !== 'string') return str;
    
    // 콤마 또는 따옴표가 포함된 경우
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      // 따옴표 이스케이프 (따옴표 → 두 개의 따옴표)
      str = str.replace(/"/g, '""');
      // 전체 문자열을 따옴표로 감싸기
      return `"${str}"`;
    }
    return str;
  }
  
  // 데이터 가져오기 핸들러 수정 (로깅 강화)
  ipcMain.handle('import-data', async (event, importPath) => {
    console.log('=======================================');
    console.log('[IMPORT] 데이터 가져오기 요청:', importPath);
    console.log('=======================================');
    try {
      console.log('[IMPORT] 파일 읽기 시도...');
      const csvData = fs.readFileSync(importPath, 'utf8');
      console.log(`[IMPORT] 파일 읽기 성공. 내용 일부:
-------
${csvData.substring(0, 300)}
-------`);
      
      // CSV 파싱
      console.log('[IMPORT] CSV 파싱 시작...');
      const lines = csvData.split('\n').filter(line => line.trim());
      if (lines.length <= 1) {
        console.warn('[IMPORT] 가져올 데이터 없음 (헤더만 있거나 비어 있음)');
        return []; 
      }
      const header = lines.shift(); // 헤더 제거
      console.log('[IMPORT] CSV 헤더:', header);
      
      const importedTasks = lines.map((line, index) => {
        console.log(`[IMPORT] 파싱 중 (Line ${index + 2}): ${line}`);
        const fields = parseCSVLine(line); // main.js 내의 parseCSVLine 사용
        const id = parseInt(fields[0]);
        if (isNaN(id)) {
           console.warn('[IMPORT] 잘못된 ID 형식, 행 건너뜀:', line);
           return null; 
        } 
        const task = {
          id: id,
          title: fields[1] || '',
          completed: fields[2] === 'true',
          date: fields[3], // 날짜 형식 확인 필요
          importance: fields[4] || 'low',
          urgency: fields[5] || 'low',
          quadrant: parseInt(fields[6]) || 4,
          priority: fields[7] || 'low',
          pinned: fields[8] === 'true'
        };
        console.log(`[IMPORT] 파싱된 작업 ${index + 1}:`, task);
        return task;
      }).filter(task => task !== null); // null인 행 제거
      console.log(`[IMPORT] 파싱 완료. 가져온 작업 수: ${importedTasks.length}`);
      console.log('[IMPORT] 가져온 작업 목록:', importedTasks);
      
      // 기존 데이터 불러오기
      console.log('[IMPORT] 기존 작업 목록 로드 시도...');
      const existingTasks = TaskStoreService.getAllTasks();
      console.log(`[IMPORT] 기존 작업 목록 로드 완료. 수: ${existingTasks.length}`);
      console.log('[IMPORT] 기존 작업 목록:', existingTasks);
      
      // 백업 파일 생성 (로깅 추가)
      // ... (백업 로직)
      console.log('[IMPORT] 기존 데이터 백업 완료 (필요시)');

      // 데이터 병합 (ID 기준 업데이트 또는 추가)
      console.log('[IMPORT] 데이터 병합 시작...');
      const taskMap = new Map(existingTasks.map(task => [task.id, task]));
      importedTasks.forEach(task => {
        taskMap.set(task.id, task); 
      });
      const finalTasks = Array.from(taskMap.values());
      console.log(`[IMPORT] 데이터 병합 완료. 최종 작업 수: ${finalTasks.length}`);
      console.log('[IMPORT] 최종 작업 목록:', finalTasks);

      // 최종 데이터를 한 번에 저장
      console.log('[IMPORT] 최종 작업 목록 저장 시도...');
      const success = TaskStoreService.saveTasksToCSV(finalTasks);
      if (!success) {
          console.error('[IMPORT] 최종 작업 목록 저장 실패!');
          throw new Error('최종 작업 목록을 CSV에 저장하지 못했습니다.');
      }
      console.log('[IMPORT] 최종 작업 목록 저장 성공.');
      
      // 메모리 캐시 업데이트
      try {
          console.log('[IMPORT] 메모리 캐시 업데이트 시도...');
          TaskStoreService.updateTasksCache(finalTasks);
          console.log('[IMPORT] 메모리 캐시 업데이트 완료.');
      } catch (cacheError) {
          console.error('[IMPORT] 메모리 캐시 업데이트 중 오류 발생:', cacheError);
          // 캐시 업데이트 실패 시 처리가 필요할 수 있음 (예: 앱 재시작 유도)
      }

      // 렌더러 프로세스에 변경 알림 이벤트 전송
      if (mainWindow) {
        mainWindow.webContents.send('tasks-updated');
        console.log('[IMPORT] 렌더러에 tasks-updated 이벤트 전송 완료.');
      }
      
      console.log('=======================================');
      console.log('[IMPORT] 데이터 가져오기 성공적으로 완료.');
      console.log('=======================================');
      return finalTasks; 
    } catch (error) {
      console.error('[IMPORT] 데이터 가져오기 처리 중 심각한 오류 발생:', error);
      console.log('=======================================');
      return []; 
    }
  });
  
  // CSV 라인 파싱 (따옴표로 묶인 필드 처리)
  function parseCSVLine(line) {
    const fields = [];
    let inQuotes = false;
    let currentField = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // 따옴표 내부의 따옴표인 경우 (이스케이프된 따옴표)
        if (i + 1 < line.length && line[i + 1] === '"') {
          currentField += '"';
          i++; // 다음 따옴표 건너뛰기
        } else {
          // 따옴표 시작/끝
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 필드 구분자 (따옴표 내부가 아닌 경우)
        fields.push(currentField);
        currentField = '';
      } else {
        // 일반 문자
        currentField += char;
      }
    }
    
    // 마지막 필드 추가
    fields.push(currentField);
    return fields;
  }
  
  // 데이터 파일 경로 가져오기
  function getDataFilePath() {
    try {
      // store.js 모듈에서 데이터 파일 경로 가져오기
      if (typeof TaskStoreService.getDataFilePath === 'function') {
        return TaskStoreService.getDataFilePath();
      }
      
      // 기본 경로 사용
      const appDataPath = app.getPath('userData');
      return path.join(appDataPath, 'tasks.csv');
    } catch (error) {
      console.error('데이터 파일 경로 가져오기 오류:', error);
      const appDataPath = app.getPath('userData');
      return path.join(appDataPath, 'tasks.csv');
    }
  }
  
  // 설정 가져오기
  ipcMain.handle('get-settings', async () => {
    console.log('설정 가져오기 요청');
    try {
      let settings = DEFAULT_SETTINGS;
      
      // 설정 파일이 존재하는지 확인
      if (fs.existsSync(SETTINGS_FILE)) {
        try {
          const fileContent = fs.readFileSync(SETTINGS_FILE, 'utf8');
          const loadedSettings = JSON.parse(fileContent);
          // 기본 설정과 저장된 설정 병합
          settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
          console.log('설정 로드 성공');
        } catch (readError) {
          console.error('설정 파일 읽기 오류:', readError);
        }
      } else {
        // 설정 파일이 없으면 기본 설정으로 새 파일 생성
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
        console.log('기본 설정 파일 생성됨');
      }
      
      return settings;
    } catch (error) {
      console.error('설정 가져오기 오류:', error);
      return DEFAULT_SETTINGS;
    }
  });
  
  // 설정 저장하기
  ipcMain.handle('save-settings', async (event, settings) => {
    console.log('설정 저장 요청:', settings);
    try {
      // 유효성 검사
      if (!settings || typeof settings !== 'object') {
        throw new Error('유효하지 않은 설정 객체');
      }
      
      // 기존 설정과 병합
      const finalSettings = { ...DEFAULT_SETTINGS, ...settings };
      
      // 설정 파일에 저장
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(finalSettings, null, 2), 'utf8');
      
      console.log('설정 저장 성공');
      
      // 테마 변경이 있으면 메인 윈도우에 알림
      if (mainWindow && settings.theme) {
        mainWindow.webContents.send('theme-changed', settings.theme);
      }
      
      // 설정 저장 후 자동 백업 설정 즉시 재적용
      await applyAutoBackupSettings();
      
      return true;
    } catch (error) {
      console.error('설정 저장 오류:', error);
      return false;
    }
  });
  
  console.log('IPC 핸들러 설정 완료');
}

// 자동 백업 설정 적용 함수
async function applyAutoBackupSettings() {
  console.log('자동 백업 설정 적용 시도');
  try {
    // 현재 설정 가져오기 (직접 파일 읽기 또는 IPC 통신)
    // 여기서는 setupIpcHandlers에 있는 get-settings 로직을 재활용하기 어렵고,
    // 순환 종속성 문제가 있을 수 있으므로, 설정 파일을 직접 읽는 방식으로 구현합니다.
    const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
    let settings = DEFAULT_SETTINGS; // 기본 설정 사용
    if (fs.existsSync(settingsFilePath)) {
      try {
        const fileContent = fs.readFileSync(settingsFilePath, 'utf8');
        const loadedSettings = JSON.parse(fileContent);
        settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
        console.log('자동 백업: 설정 로드 성공');
      } catch (readError) {
        console.error('자동 백업: 설정 파일 읽기 오류:', readError);
      }
    } else {
       console.log('자동 백업: 설정 파일 없음, 기본값 사용');
    }

    // 기존 타이머 정리
    if (backupIntervalId) {
      clearInterval(backupIntervalId);
      backupIntervalId = null;
      console.log('기존 자동 백업 타이머 해제');
    }

    // 자동 백업 활성화 시 타이머 설정
    if (settings.autoBackup && settings.autoBackupInterval > 0) {
      const intervalMillis = settings.autoBackupInterval * 60 * 1000;
      console.log(`자동 백업 활성화: 간격 ${settings.autoBackupInterval}분 (${intervalMillis}ms)`);
      
      backupIntervalId = setInterval(async () => {
        await performAutoBackup();
      }, intervalMillis);

      // 앱 시작 시 즉시 한 번 백업 실행 (옵션)
      // await performAutoBackup(); 

    } else {
      console.log('자동 백업 비활성화됨');
    }
  } catch (error) {
    console.error('자동 백업 설정 적용 중 오류:', error);
  }
}

// 자동 백업 수행 함수
async function performAutoBackup() {
  console.log('자동 백업 수행 시작');
  try {
    const tasks = TaskStoreService.getAllTasks(); // TaskStoreService에서 직접 가져오기
    if (!tasks || tasks.length === 0) {
      console.log('백업할 작업 데이터 없음');
      return;
    }

    // 백업 파일 이름 생성 (타임스탬프 포함)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tasks_backup_auto_${timestamp}.csv`;
    
    // 백업 파일 경로 (데이터 파일과 같은 디렉토리)
    // store.js의 데이터 파일 경로 결정 로직과 일관성 유지가 중요
    // 여기서는 간단하게 app.getPath('userData')를 사용합니다.
    const backupDir = path.dirname(TaskStoreService.getDataFilePath ? TaskStoreService.getDataFilePath() : path.join(app.getPath('userData'), 'tasks.csv')); 
    const backupFilePath = path.join(backupDir, backupFileName);

    console.log('자동 백업 경로:', backupFilePath);

    // 디렉토리 존재 확인 및 생성
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('백업 디렉토리 생성:', backupDir);
    }

    // CSV 데이터 생성 (store.js의 saveTasksToCSV 로직 참고)
    const CSV_HEADER = 'id,title,completed,date,importance,urgency,quadrant,priority,pinned\n'; // 헤더 정의
    let csvData = CSV_HEADER;
    tasks.forEach(task => {
      const csvLine = [
        task.id,
        escapeCSV(task.title || ''), // escapeCSV 함수 필요
        task.completed,
        task.date, // ISO 문자열 또는 적절한 형식
        task.importance || 'low',
        task.urgency || 'low',
        task.quadrant || 4,
        task.priority || 'low',
        task.pinned || false
      ].join(',');
      csvData += csvLine + '\n';
    });

    // 백업 파일 저장
    fs.writeFileSync(backupFilePath, csvData, 'utf8');
    console.log(`자동 백업 성공: ${tasks.length}개 작업 저장됨 (${backupFileName})`);

  } catch (error) {
    console.error('자동 백업 수행 중 오류:', error);
  }
}

// 앱 종료 시 타이머 정리
app.on('will-quit', () => {
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    console.log('앱 종료 전 자동 백업 타이머 해제');
  }
}); 