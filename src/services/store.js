const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 애플리케이션 실행 경로 가져오기 (exe 파일이 있는 디렉토리)
function getAppDirectory() {
  try {
    // 실행 파일 경로 가져오기 (exe 파일의 실제 위치)
    const execPath = process.execPath;
    const exeDir = path.dirname(execPath);
    
    console.log('실행 파일 경로:', execPath);
    console.log('실행 파일 디렉토리:', exeDir);
    
    return exeDir;
  } catch (error) {
    console.error('앱 디렉토리 가져오기 오류:', error);
    // 오류가 발생하면 현재 작업 디렉토리 사용
    console.log('현재 작업 디렉토리로 폴백:', process.cwd());
    return process.cwd();
  }
}

// 가능한 데이터 파일 경로 목록
function getPossibleDataPaths() {
  const paths = [];
  
  try {
    // 1. 실행 파일 위치 (기본)
    const exeDir = getAppDirectory();
    paths.push(path.join(exeDir, 'tasks.csv'));
    
    // 2. 현재 작업 디렉토리
    paths.push(path.join(process.cwd(), 'tasks.csv'));
    
    // 3. 사용자 홈 디렉토리
    if (process.env.USERPROFILE) {
      paths.push(path.join(process.env.USERPROFILE, 'TodoTools', 'tasks.csv'));
    }
    
    // 4. 앱 데이터 디렉토리 (Electron에서 제공)
    if (app && app.getPath) {
      try {
        const appDataPath = app.getPath('userData');
        paths.push(path.join(appDataPath, 'tasks.csv'));
      } catch (e) {
        console.error('앱 데이터 경로 가져오기 오류:', e.message);
      }
    }
    
    // 5. 백업 파일 위치
    paths.push(path.join(process.cwd(), 'tasks-backup.csv'));
  } catch (error) {
    console.error('가능한 데이터 파일 경로 목록 생성 오류:', error.message);
  }
  
  console.log('가능한 데이터 파일 경로:', paths);
  return paths;
}

// 데이터 파일 경로 결정 (실제 존재하는 파일 찾기)
function resolveDataFilePath() {
  const possiblePaths = getPossibleDataPaths();
  
  // 존재하는 첫 번째 파일 반환
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log('기존 데이터 파일 발견:', filePath);
      return filePath;
    }
  }
  
  // 존재하는 파일이 없으면 기본 경로 반환
  const defaultPath = possiblePaths[0];
  console.log('기존 데이터 파일 없음, 기본 경로 사용:', defaultPath);
  return defaultPath;
}

// 데이터 파일 경로
const dataFilePath = resolveDataFilePath();
console.log('데이터 파일 경로:', dataFilePath);

// CSV 헤더 (작업 속성)
const CSV_HEADER = 'id,title,completed,date,importance,urgency,quadrant,priority,pinned\n';

// CSV 파일에서 작업 데이터 로드
function loadTasksFromCSV() {
  try {
    // 파일이 존재하지 않으면 모든 가능한 경로에서 찾기
    if (!fs.existsSync(dataFilePath)) {
      console.log('기본 위치에서 데이터 파일을 찾을 수 없습니다.');
      
      // 다른 가능한 경로에서 파일 찾기
      const possiblePaths = getPossibleDataPaths();
      for (const path of possiblePaths) {
        if (fs.existsSync(path) && path !== dataFilePath) {
          console.log('대체 위치에서 데이터 파일 발견:', path);
          
          // 파일 내용 읽기
          const csvData = fs.readFileSync(path, 'utf8');
          const tasks = parseCSVData(csvData);
          
          // 발견한 파일 내용을 기본 위치에 복사
          try {
            fs.writeFileSync(dataFilePath, csvData, 'utf8');
            console.log('데이터 파일을 기본 위치로 복사했습니다:', dataFilePath);
          } catch (copyError) {
            console.error('파일 복사 오류:', copyError.message);
          }
          
          return tasks;
        }
      }
      
      // 어떤 경로에서도 찾지 못한 경우 빈 CSV 파일 생성
      console.log('모든 위치에서 데이터 파일을 찾을 수 없습니다. 새 파일을 생성합니다.');
      fs.writeFileSync(dataFilePath, CSV_HEADER, 'utf8');
      return [];
    }

    // 파일이 존재하는 경우 CSV 데이터 파싱
    const csvData = fs.readFileSync(dataFilePath, 'utf8');
    return parseCSVData(csvData);
  } catch (error) {
    console.error('CSV에서 작업 로드 오류:', error.message);
    console.error('오류 위치:', error.stack);
    return [];
  }
}

// CSV 데이터 파싱 함수 (공통 로직 분리)
function parseCSVData(csvData) {
  try {
    const lines = csvData.split('\n');
    
    // 첫 번째 줄은 헤더이므로 건너뜀
    const tasks = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 빈 줄 무시
      
      // CSV 라인을 필드로 분할
      const fields = parseCSVLine(line);
      
      // 작업 객체로 변환
      if (fields.length >= 5) {
        const task = {
          id: parseInt(fields[0]),
          title: fields[1],
          completed: fields[2] === 'true',
          date: fields[3],  // ISO 문자열로 저장됨
          importance: fields[4] || 'low',
          urgency: fields[5] || 'low',
          quadrant: parseInt(fields[6]) || 4,
          priority: fields[7] || 'low',
          pinned: fields[8] === 'true'
        };
        tasks.push(task);
      }
    }
    
    console.log(`${tasks.length}개의 작업을 로드했습니다.`);
    return tasks;
  } catch (error) {
    console.error('CSV 데이터 파싱 오류:', error.message);
    return [];
  }
}

// CSV 파일에 작업 데이터 저장
function saveTasksToCSV(tasks) {
  try {
    const dataDir = getAppDirectory();
    
    // 디렉토리가 존재하는지 확인하고 읽기/쓰기 권한이 있는지 확인
    try {
      // 디렉토리에 대한 접근 권한 확인
      fs.accessSync(dataDir, fs.constants.W_OK);
      console.log('데이터 디렉토리 쓰기 권한 확인됨:', dataDir);
    } catch (accessError) {
      console.error('데이터 디렉토리 접근 오류:', accessError.message);
      // 현재 사용자의 문서 폴더 등으로 폴백하는 로직 추가 가능
      return false;
    }
    
    // CSV 문자열 생성
    let csvData = CSV_HEADER;
    
    tasks.forEach(task => {
      // 날짜 형식을 YYYY-MM-DD로 통일
      let dateString = '';
      if (task.date) {
          try {
              // Date 객체인지 확인 후 변환, 아니면 문자열 그대로 사용 (YYYY-MM-DD 가정)
              const d = new Date(task.date);
              // 유효한 날짜 객체인지 확인 (Invalid Date 방지)
              if (!isNaN(d.getTime())) {
                  dateString = d.toISOString().split('T')[0];
              } else if (typeof task.date === 'string' && task.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  // YYYY-MM-DD 형식의 문자열이면 그대로 사용
                  dateString = task.date; 
              }
          } catch (e) {
              console.warn('날짜 변환 오류, 빈 문자열 사용:', task.date, e);
          }
      }

      // 작업 속성을 CSV 형식으로 변환
      const csvLine = [
        task.id,
        escapeCSV(task.title || ''),
        task.completed,
        dateString, // 변환된 날짜 문자열 사용
        task.importance || 'low',
        task.urgency || 'low',
        task.quadrant || 4,
        task.priority || 'low',
        task.pinned || false
      ].join(',');
      
      csvData += csvLine + '\n';
    });
    
    // 저장할 실제 파일 경로 출력
    console.log('CSV 저장 경로:', dataFilePath);
    
    // CSV 파일 저장
    fs.writeFileSync(dataFilePath, csvData, 'utf8');
    console.log(`${tasks.length}개의 작업이 CSV 파일에 저장되었습니다.`);
    
    // 파일이 실제로 생성되었는지 확인
    if (fs.existsSync(dataFilePath)) {
      console.log('CSV 파일 저장 확인됨:', dataFilePath);
      // 파일 크기 확인
      const stats = fs.statSync(dataFilePath);
      console.log('CSV 파일 크기:', stats.size, 'bytes');
    } else {
      console.error('CSV 파일이 저장되지 않았습니다.');
    }
    
    return true;
  } catch (error) {
    console.error('CSV에 작업 저장 오류:', error.message);
    console.error('오류 위치:', error.stack);
    
    return false;
  }
}

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

// 초기 데이터 로드
let tasksCache = loadTasksFromCSV();

// 싱글톤 패턴을 위한 레퍼런스
let _lastId = null;
let _dataFilePath = null;

// 데이터 파일 경로 가져오기 함수 추가
function getDataFilePath() {
  if (_dataFilePath) {
    return _dataFilePath;
  }
  
  _dataFilePath = resolveDataFilePath();
  return _dataFilePath;
}

// 새 ID 생성 (마지막 ID보다 1 큰 값)
function generateId() {
  if (_lastId === null) {
    // 저장된 작업에서 가장 큰 ID 찾기
    _lastId = tasksCache.reduce((maxId, task) => Math.max(maxId, task.id || 0), 0);
  }
  return ++_lastId;
}

// 메모리 캐시 직접 업데이트 함수
function updateTasksCache(newTasks) {
  try {
    // 날짜 형식을 CSV 저장 형식(문자열)과 일치시키거나,
    // getAllTasks에서 객체 변환하므로 여기서도 객체로 저장해도 무방
    // 여기서는 getAllTasks와 유사하게 Date 객체로 변환된 형태를 저장 가정
    // 단, ID 등 기본 필드는 newTasks에 이미 있어야 함.
    // saveTasksToCSV와의 일관성을 위해 문자열로 저장하는 것이 더 안전할 수 있음.
    // 여기서는 CSV 저장 직후 호출되므로, newTasks는 이미 적절한 형식을 가짐 (import-data에서 finalTasks 전달 예정)
    
    // 문자열 기반으로 캐시 업데이트 (saveTasksToCSV와 일관성)
    tasksCache = newTasks.map(task => ({
        ...task, // id, title, completed, importance, urgency, quadrant, priority, pinned
        date: task.date instanceof Date ? task.date.toISOString().split('T')[0] : task.date // YYYY-MM-DD 문자열 보장
    }));
    
    // 마지막 ID 업데이트 (generateId 위함)
    _lastId = tasksCache.reduce((maxId, task) => Math.max(maxId, task.id || 0), 0);
    console.log('[CACHE] 메모리 내 작업 캐시 업데이트 완료.');
    console.log('[CACHE] 새 캐시 크기:', tasksCache.length);
  } catch (error) {
      console.error('[CACHE] 메모리 캐시 업데이트 오류:', error);
  }
}

const TaskStoreService = {
  // 모든 작업 가져오기
  getAllTasks: () => {
    try {
      // 날짜 문자열을 Date 객체로 변환하여 반환
      return tasksCache.map(task => ({
        ...task,
        date: task.date ? new Date(task.date) : new Date() // 여기서 Date 객체로!
      }));
    } catch (error) {
      console.error('getAllTasks 오류:', error);
      return [];
    }
  },

  // 새 작업 추가
  addTask: (task) => {
    try {
      const newTask = {
        ...task,
        id: generateId(),
        date: task.date instanceof Date ? task.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0] // YYYY-MM-DD 문자열로
      };
      tasksCache.push(newTask);
      saveTasksToCSV(tasksCache);
      return { ...newTask, date: new Date(newTask.date) }; // 반환 시 Date 객체로
    } catch (error) {
      console.error('addTask 오류:', error);
      return { ...task, id: Date.now() };
    }
  },

  // 작업 업데이트
  updateTask: (updatedTask) => {
    try {
      const index = tasksCache.findIndex(task => task.id === updatedTask.id);
      if (index !== -1) {
        const taskToStore = {
          ...updatedTask,
          date: updatedTask.date instanceof Date ? updatedTask.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0] // YYYY-MM-DD 문자열로
        };
        tasksCache[index] = taskToStore;
        saveTasksToCSV(tasksCache);
        return { ...taskToStore, date: new Date(taskToStore.date) }; // 반환 시 Date 객체로
      }
      console.warn(`ID가 ${updatedTask.id}인 작업을 찾을 수 없습니다.`);
      return updatedTask;
    } catch (error) {
      console.error('updateTask 오류:', error);
      return updatedTask;
    }
  },

  // 작업 삭제
  deleteTask: (id) => {
    try {
      const initialLength = tasksCache.length;
      tasksCache = tasksCache.filter(task => task.id !== id);
      if (tasksCache.length !== initialLength) {
        saveTasksToCSV(tasksCache);
        return id;
      }
      console.warn(`ID가 ${id}인 작업을 찾을 수 없습니다.`);
      return id;
    } catch (error) {
      console.error('deleteTask 오류:', error);
      return id;
    }
  },
  
  // 데이터 파일 경로 가져오기
  getDataFilePath: getDataFilePath,

  // CSV 저장 함수 노출
  saveTasksToCSV: saveTasksToCSV,

  // 메모리 캐시 업데이트 함수 노출 추가
  updateTasksCache: updateTasksCache 
};

module.exports = TaskStoreService; 