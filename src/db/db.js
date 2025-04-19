const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

// 데이터베이스가 저장될 경로
let dbPath;

// Electron 앱의 데이터 디렉토리(userDataPath)를 가져옴
function getDatabasePath() {
  // userDataPath는 앱이 실행 중일 때만 사용 가능
  const userDataPath = app.getPath('userData');
  const dbDirectory = path.join(userDataPath, 'database');
  
  // 디렉토리가 없으면 생성
  if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
  }
  
  dbPath = path.join(dbDirectory, 'todotools.db');
  console.log(`데이터베이스 경로: ${dbPath}`);
  return dbPath;
}

// 데이터베이스 연결 초기화 - 싱글톤 인스턴스 유지
let dbInstance = null;

function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }
  
  try {
    const dbPath = getDatabasePath();
    dbInstance = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
      } else {
        console.log('데이터베이스 연결 성공');
        createTables(dbInstance);
      }
    });
    
    return dbInstance;
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
    throw error;
  }
}

// 테이블 생성
function createTables(db) {
  // tasks 테이블 생성 (importance, urgency, quadrant 필드 추가)
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        date TEXT,
        priority TEXT DEFAULT 'none',
        pinned INTEGER DEFAULT 0,
        importance TEXT DEFAULT 'low',
        urgency TEXT DEFAULT 'low',
        quadrant INTEGER DEFAULT 4
      )
    `, (err) => {
      if (err) {
        console.error('tasks 테이블 생성 오류:', err.message);
      } else {
        console.log('tasks 테이블이 생성되었거나 이미 존재합니다.');
        
        // 테이블 구조 확인 및 필요한 경우 컬럼 추가
        updateTableSchema(db);
        
        // 기존 테이블에서 데이터 마이그레이션
        migrateData(db);
      }
    });
  });
}

// 테이블 스키마 업데이트 (필요한 컬럼 추가)
function updateTableSchema(db) {
  // 테이블 정보 확인
  db.all("PRAGMA table_info(tasks)", [], (err, columns) => {
    if (err) {
      console.error('테이블 정보 조회 오류:', err.message);
      return;
    }
    
    console.log('현재 tasks 테이블 구조:', columns.map(col => col.name).join(', '));
    
    // 컬럼 존재 여부 확인
    const columnNames = columns.map(col => col.name);
    
    // importance 컬럼 확인 및 추가
    if (!columnNames.includes('importance')) {
      console.log('importance 컬럼이 없습니다. 추가합니다...');
      db.run("ALTER TABLE tasks ADD COLUMN importance TEXT DEFAULT 'low'", (err) => {
        if (err) {
          console.error('importance 컬럼 추가 오류:', err.message);
        } else {
          console.log('importance 컬럼이 추가되었습니다.');
        }
      });
    }
    
    // urgency 컬럼 확인 및 추가
    if (!columnNames.includes('urgency')) {
      console.log('urgency 컬럼이 없습니다. 추가합니다...');
      db.run("ALTER TABLE tasks ADD COLUMN urgency TEXT DEFAULT 'low'", (err) => {
        if (err) {
          console.error('urgency 컬럼 추가 오류:', err.message);
        } else {
          console.log('urgency 컬럼이 추가되었습니다.');
        }
      });
    }
    
    // quadrant 컬럼 확인 및 추가
    if (!columnNames.includes('quadrant')) {
      console.log('quadrant 컬럼이 없습니다. 추가합니다...');
      db.run("ALTER TABLE tasks ADD COLUMN quadrant INTEGER DEFAULT 4", (err) => {
        if (err) {
          console.error('quadrant 컬럼 추가 오류:', err.message);
        } else {
          console.log('quadrant 컬럼이 추가되었습니다.');
        }
      });
    }
  });
}

// 기존 데이터를 새 테이블로 마이그레이션
function migrateData(db) {
  // tasks 테이블이 존재하는지 확인
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'", (err, row) => {
    if (!err && row) {
      console.log('tasks 테이블 존재, 데이터 마이그레이션 시작');
      
      // tasks 테이블에서 데이터 가져오기
      db.all("SELECT * FROM tasks", [], (err, rows) => {
        if (err) {
          console.error('tasks 테이블 조회 오류:', err.message);
        } else if (rows && rows.length > 0) {
          console.log(`${rows.length}개의 할 일이 tasks에서 확인됨`);
        }
      });
    }
  });
  
  // matrix_tasks 테이블이 존재하는지 확인
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='matrix_tasks'", (err, row) => {
    if (!err && row) {
      console.log('matrix_tasks 테이블 존재, 데이터 마이그레이션 시작');
      
      // matrix_tasks 테이블에서 데이터 가져오기
      db.all("SELECT * FROM matrix_tasks", [], (err, rows) => {
        if (err) {
          console.error('matrix_tasks 테이블 조회 오류:', err.message);
        } else if (rows && rows.length > 0) {
          console.log(`${rows.length}개의 할 일이 matrix_tasks에서 확인됨`);
          
          // tasks 테이블로 마이그레이션
          migrateMatrixTasks(db, rows);
        }
      });
    }
  });
}

// 매트릭스 할 일을 통합 테이블로 마이그레이션
function migrateMatrixTasks(db, matrixTasks) {
  const stmt = db.prepare(`
    INSERT INTO tasks 
    (title, completed, date, importance, urgency, quadrant, priority, pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let migratedCount = 0;
  
  matrixTasks.forEach(task => {
    // quadrant에 따라 priority 설정
    let priority = 'none';
    switch (task.quadrant) {
      case 1:
        priority = 'high';
        break;
      case 2:
        priority = 'medium';
        break;
      case 3:
        priority = 'low';
        break;
      case 4:
      default:
        priority = 'none';
        break;
    }
    
    stmt.run(
      task.title, 
      task.completed, 
      task.date, 
      task.importance, 
      task.urgency, 
      task.quadrant,
      priority,
      0, // 기본 pinned
      function(err) {
        if (err) {
          console.error('할 일 마이그레이션 오류:', err.message);
        } else {
          migratedCount++;
        }
      }
    );
  });
  
  stmt.finalize(() => {
    console.log(`${migratedCount}개의 할 일이 matrix_tasks에서 마이그레이션됨`);
  });
}

// Promise 래퍼 함수 - 데이터베이스 연결 관리 개선
function getConnection() {
  return initDatabase();
}

// 통합된 할 일 관련 함수들
const tasksDb = {
  // 모든 할 일 가져오기
  getAllTasks: (callback) => {
    const db = getConnection();
    db.all('SELECT * FROM tasks ORDER BY pinned DESC, date ASC', [], (err, rows) => {
      if (err) {
        console.error('할 일 가져오기 오류:', err.message);
        callback(err);
      } else {
        // 날짜 형식 변환
        const tasks = rows.map(row => ({
          ...row,
          date: new Date(row.date),
          completed: row.completed === 1,
          pinned: row.pinned === 1
        }));
        console.log('전체 할 일 가져옴:', tasks.length);
        callback(null, tasks);
      }
    });
  },
  
  // 할 일 추가
  addTask: (task, callback) => {
    const db = getConnection();
    
    // JavaScript 객체를 SQLite 형식으로 변환
    const { 
      title, 
      date, 
      priority = 'none', 
      pinned, 
      completed, 
      importance = priority || 'none', 
      urgency = 'none',
      quadrant = 4
    } = task;
    
    const formattedDate = date instanceof Date ? date.toISOString() : new Date().toISOString();
    const formattedPinned = pinned ? 1 : 0;
    const formattedCompleted = completed ? 1 : 0;
    
    // 매트릭스 뷰 속성 계산
    let calculatedImportance = importance;
    let calculatedUrgency = urgency;
    let calculatedQuadrant = quadrant;
    
    // priority가 있고 importance가 없으면 priority에서 importance 값 계산
    if (priority && !task.hasOwnProperty('importance')) {
      switch(priority) {
        case 'high':
          calculatedImportance = 'high';
          break;
        case 'medium':
          calculatedImportance = 'medium';
          break;
        case 'low':
          calculatedImportance = 'low';
          break;
        default:
          calculatedImportance = 'none';
      }
    }
    
    // quadrant가 있으면 해당 quadrant에 맞는 importance/urgency 설정
    if (quadrant) {
      switch (quadrant) {
        case 1:
          calculatedImportance = 'high';
          calculatedUrgency = 'high';
          break;
        case 2:
          calculatedImportance = 'high';
          calculatedUrgency = 'low';
          break;
        case 3:
          calculatedImportance = 'low';
          calculatedUrgency = 'high';
          break;
        case 4:
          if (calculatedImportance === 'none' || calculatedUrgency === 'none') {
            calculatedImportance = 'none';
            calculatedUrgency = 'none';
          } else {
            calculatedImportance = 'low';
            calculatedUrgency = 'low';
          }
          break;
      }
    } 
    // importance와 urgency가 있으면 해당 값에 맞는 quadrant 계산
    else if (calculatedImportance && calculatedUrgency) {
      if (calculatedImportance === 'high' && calculatedUrgency === 'high') calculatedQuadrant = 1;
      else if (calculatedImportance === 'high' && calculatedUrgency === 'low') calculatedQuadrant = 2;
      else if (calculatedImportance === 'low' && calculatedUrgency === 'high') calculatedQuadrant = 3;
      else if (calculatedImportance === 'low' && calculatedUrgency === 'low') calculatedQuadrant = 4;
      else calculatedQuadrant = 4; // 'none'이 포함된 경우
    }
    
    db.run(
      `INSERT INTO tasks 
       (title, date, priority, pinned, completed, importance, urgency, quadrant) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, 
        formattedDate, 
        priority, 
        formattedPinned, 
        formattedCompleted, 
        calculatedImportance, 
        calculatedUrgency, 
        calculatedQuadrant
      ],
      function(err) {
        if (err) {
          console.error('할 일 추가 오류:', err.message);
          callback(err);
        } else {
          console.log('할 일 추가됨, ID:', this.lastID);
          
          // 방금 추가한 할 일 정보 가져오기
          db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
              console.error('추가된 할 일 조회 오류:', err.message);
              callback(err);
            } else {
              const newTask = {
                ...row,
                date: new Date(row.date),
                completed: row.completed === 1,
                pinned: row.pinned === 1
              };
              callback(null, newTask);
            }
          });
        }
      }
    );
  },
  
  // 할 일 업데이트
  updateTask: (task, callback) => {
    const db = getConnection();
    
    const { 
      id, 
      title, 
      date, 
      priority, 
      pinned, 
      completed, 
      importance, 
      urgency, 
      quadrant 
    } = task;
    
    const formattedDate = date instanceof Date ? date.toISOString() : (
      typeof date === 'string' ? date : new Date().toISOString()
    );
    const formattedPinned = pinned ? 1 : 0;
    const formattedCompleted = completed ? 1 : 0;
    
    // 매트릭스 뷰 속성 계산
    let calculatedImportance = importance || 'none';
    let calculatedUrgency = urgency || 'none';
    let calculatedQuadrant = quadrant || 4;
    let calculatedPriority = priority;
    
    // priority가 변경되었고 importance가 없으면 priority에서 importance 계산
    if (priority && !importance) {
      switch(priority) {
        case 'high':
          calculatedImportance = 'high';
          break;
        case 'medium':
          calculatedImportance = 'medium';
          break;
        case 'low':
          calculatedImportance = 'low';
          break;
        default:
          calculatedImportance = 'none';
      }
    }
    
    // importance가 변경되었고 priority가 없으면 importance에서 priority 계산
    if (!priority && importance) {
      switch(importance) {
        case 'high':
          calculatedPriority = 'high';
          break;
        case 'medium':
          calculatedPriority = 'medium';
          break;
        case 'low':
          calculatedPriority = 'low';
          break;
        default:
          calculatedPriority = 'none';
      }
    }
    
    // quadrant가 변경되었으면 importance와 urgency도 함께 업데이트
    if (quadrant) {
      switch (quadrant) {
        case 1:
          calculatedImportance = 'high';
          calculatedUrgency = 'high';
          calculatedPriority = 'high';
          break;
        case 2:
          calculatedImportance = 'high';
          calculatedUrgency = 'low';
          calculatedPriority = 'medium';
          break;
        case 3:
          calculatedImportance = 'low';
          calculatedUrgency = 'high';
          calculatedPriority = 'low';
          break;
        case 4:
          calculatedImportance = 'low';
          calculatedUrgency = 'low';
          calculatedPriority = 'none';
          break;
      }
    } 
    // importance와 urgency가 변경되었으면 quadrant 업데이트
    else if (importance && urgency) {
      if (importance === 'high' && urgency === 'high') {
        calculatedQuadrant = 1;
        calculatedPriority = 'high';
      }
      else if (importance === 'high' && urgency === 'low') {
        calculatedQuadrant = 2;
        calculatedPriority = 'medium';
      }
      else if (importance === 'low' && urgency === 'high') {
        calculatedQuadrant = 3;
        calculatedPriority = 'low';
      }
      else if (importance === 'low' && urgency === 'low') {
        calculatedQuadrant = 4;
        calculatedPriority = 'none';
      }
    }
    // priority가 변경되었으면 매트릭스 속성 업데이트
    else if (priority) {
      switch (priority) {
        case 'high':
          calculatedImportance = 'high';
          calculatedUrgency = 'high';
          calculatedQuadrant = 1;
          break;
        case 'medium':
          calculatedImportance = 'high';
          calculatedUrgency = 'low';
          calculatedQuadrant = 2;
          break;
        case 'low':
          calculatedImportance = 'low';
          calculatedUrgency = 'high';
          calculatedQuadrant = 3;
          break;
        case 'none':
          calculatedImportance = 'low';
          calculatedUrgency = 'low';
          calculatedQuadrant = 4;
          break;
      }
    }
    
    console.log('업데이트 시도 중, 할 일 ID:', id, 'quadrant:', calculatedQuadrant, 'priority:', calculatedPriority);
    
    db.run(
      `UPDATE tasks SET 
       title = ?, date = ?, priority = ?, pinned = ?, completed = ?, 
       importance = ?, urgency = ?, quadrant = ? 
       WHERE id = ?`,
      [
        title, 
        formattedDate, 
        calculatedPriority || priority, 
        formattedPinned, 
        formattedCompleted,
        calculatedImportance,
        calculatedUrgency,
        calculatedQuadrant,
        id
      ],
      function(err) {
        if (err) {
          console.error('할 일 업데이트 오류:', err.message);
          callback(err);
        } else {
          if (this.changes === 0) {
            console.warn(`ID ${id}인 할 일이 없어 업데이트되지 않았습니다.`);
          } else {
            console.log('할 일 업데이트됨, ID:', id, '변경 수:', this.changes);
          }
          
          // 업데이트된 할 일 정보 가져오기
          db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
            if (err) {
              console.error('업데이트된 할 일 조회 오류:', err.message);
              callback(err);
            } else if (!row) {
              const error = new Error(`ID가 ${id}인 할 일을 찾을 수 없습니다.`);
              console.error(error.message);
              callback(error);
            } else {
              const updatedTask = {
                ...row,
                date: new Date(row.date),
                completed: row.completed === 1,
                pinned: row.pinned === 1
              };
              callback(null, updatedTask);
            }
          });
        }
      }
    );
  },
  
  // 할 일 삭제
  deleteTask: (id, callback) => {
    const db = getConnection();
    
    console.log('삭제 시도 중, 할 일 ID:', id);
    
    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('할 일 삭제 오류:', err.message);
        callback(err);
      } else {
        if (this.changes === 0) {
          console.warn(`ID ${id}인 할 일이 없어 삭제되지 않았습니다.`);
        } else {
          console.log('할 일 삭제됨, ID:', id, '변경 수:', this.changes);
        }
        callback(null, id);
      }
    });
  },
  
  // 매트릭스 뷰용 할 일 가져오기
  getTasksForMatrix: (callback) => {
    const db = getConnection();
    db.all('SELECT * FROM tasks ORDER BY quadrant ASC, date ASC', [], (err, rows) => {
      if (err) {
        console.error('매트릭스 할 일 가져오기 오류:', err.message);
        callback(err);
      } else {
        // 날짜 형식 변환 및 불리언 변환
        const tasks = rows.map(row => ({
          ...row,
          date: new Date(row.date),
          completed: row.completed === 1,
          pinned: row.pinned === 1
        }));
        console.log('매트릭스용 할 일 가져옴:', tasks.length);
        callback(null, tasks);
      }
    });
  }
};

module.exports = {
  initDatabase,
  tasksDb
}; 