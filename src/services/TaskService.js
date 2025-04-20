// 초기 변수 설정
let electronAPI = null;

// Electron 환경인지 확인 및 초기화 함수
function initElectron() {
  console.log('TaskService 초기화 시작');
  
  // window 객체 확인
  if (typeof window === 'undefined') {
    console.warn('window 객체가 없습니다. 브라우저 환경이 아닙니다.');
    return null;
  }
  
  // Electron API 접근 확인
  try {
    // 1초마다 window.electronAPI가 있는지 확인하고 최대 5초 동안 시도
    let retryCount = 0;
    const maxRetries = 5;
    
    function checkForElectronAPI() {
      console.log(`API 확인 시도 ${retryCount + 1}/${maxRetries}`);
      
      if (window.electronAPI) {
        console.log('Electron API 사용 가능:', window.electronAPI);
        electronAPI = window.electronAPI;
        // 디버깅용 로그 전송
        try {
          window.electronAPI.logMessage('TaskService: Electron API 연결 성공');
        } catch (e) {
          console.error('로그 전송 실패:', e);
        }
        return window.electronAPI;
      } else {
        console.warn(`window.electronAPI가 아직 없습니다. (시도: ${retryCount + 1}/${maxRetries})`);
        retryCount++;
        
        if (retryCount < maxRetries) {
          setTimeout(checkForElectronAPI, 1000);
        } else {
          console.error('Electron API를 찾을 수 없습니다. 개발 환경 모드로 실행합니다.');
        }
        return null;
      }
    }
    
    // 최초 실행
    return checkForElectronAPI();
  } catch (error) {
    console.error('Electron API 초기화 오류:', error);
    return null;
  }
}

// 초기화 실행
initElectron();

/**
 * 할 일 관리를 위한 서비스
 */
const TaskService = {
  /**
   * 모든 할 일 가져오기
   * @returns {Promise<Array>} 할 일 목록
   */
  getAllTasks: async () => {
    console.log('TaskService.getAllTasks 호출됨');
    console.log('현재 electronAPI 상태:', electronAPI ? '사용 가능' : '사용 불가');
    
    try {
      if (!electronAPI) {
        console.warn('Electron API 사용 불가: 개발 환경 모드로 더미 데이터 반환');
        // 개발 환경을 위한 더미 데이터
        return [
          { id: 1, title: '중요하고 긴급한 일 1', completed: false, importance: 'high', urgency: 'high', quadrant: 1, date: new Date(), priority: 'high', pinned: false },
          { id: 2, title: '중요하고 긴급한 일 2', completed: true, importance: 'high', urgency: 'high', quadrant: 1, date: new Date(), priority: 'high', pinned: false },
          { id: 3, title: '중요하지만 긴급하지 않은 일', completed: false, importance: 'high', urgency: 'low', quadrant: 2, date: new Date(), priority: 'high', pinned: false },
          { id: 4, title: '중요하지 않지만 긴급한 일', completed: false, importance: 'low', urgency: 'high', quadrant: 3, date: new Date(), priority: 'low', pinned: false },
          { id: 5, title: '중요하지도 긴급하지도 않은 일', completed: false, importance: 'low', urgency: 'low', quadrant: 4, date: new Date(), priority: 'low', pinned: false },
        ];
      }
      
      console.log('Electron API로 작업 목록 요청 중...');
      // 디버깅 로그 전송
      try {
        await electronAPI.logMessage('작업 목록 요청');
        
        const tasks = await electronAPI.getAllTasks();
        console.log('Electron API로 작업 목록 수신 완료:', tasks);
        return tasks;
      } catch (requestError) {
        console.error('IPC 요청 중 오류:', requestError);
        throw requestError;
      }
    } catch (error) {
      console.error('할 일을 가져오는 중 오류 발생:', error);
      // 오류가 발생하면 더미 데이터 반환
      return [
        { id: 1, title: '더미 데이터 1 (오류 발생)', completed: false, importance: 'high', urgency: 'high', quadrant: 1, date: new Date(), priority: 'high', pinned: false },
        { id: 2, title: '더미 데이터 2 (오류 발생)', completed: true, importance: 'high', urgency: 'high', quadrant: 1, date: new Date(), priority: 'high', pinned: false },
      ];
    }
  },

  /**
   * 새 할 일 추가하기
   * @param {Object} task 새 할 일 객체
   * @returns {Promise<Object>} 추가된 할 일 객체
   */
  addTask: async (task) => {
    console.log('TaskService.addTask 호출됨:', task);
    
    try {
      if (!electronAPI) {
        console.warn('Electron API 사용 불가: 개발 환경 모드로 더미 응답 반환');
        return { ...task, id: Date.now() };
      }
      
      const newTask = await electronAPI.addTask(task);
      console.log('새 할 일이 추가되었습니다:', newTask);
      return newTask;
    } catch (error) {
      console.error('할 일을 추가하는 중 오류 발생:', error);
      return { ...task, id: Date.now() }; // 오류 시 로컬에서 처리
    }
  },

  /**
   * 할 일 업데이트하기
   * @param {Object} task 업데이트할 할 일 객체
   * @returns {Promise<Object>} 업데이트된 할 일 객체
   */
  updateTask: async (task) => {
    console.log('TaskService.updateTask 호출됨:', task);
    
    try {
      if (!electronAPI) {
        console.warn('Electron API 사용 불가: 개발 환경 모드로 더미 응답 반환');
        return task;
      }
      
      const updatedTask = await electronAPI.updateTask(task);
      console.log('할 일이 업데이트되었습니다:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('할 일을 업데이트하는 중 오류 발생:', error);
      return task; // 오류 시 원래 작업 반환
    }
  },

  /**
   * 할 일 삭제하기
   * @param {number} id 삭제할 할 일 ID
   * @returns {Promise<number>} 삭제된 할 일 ID
   */
  deleteTask: async (id) => {
    console.log('TaskService.deleteTask 호출됨:', id);
    
    try {
      if (!electronAPI) {
        console.warn('Electron API 사용 불가: 개발 환경 모드로 더미 응답 반환');
        return id;
      }
      
      const deletedId = await electronAPI.deleteTask(id);
      console.log(`ID가 ${deletedId}인 할 일이 삭제되었습니다`);
      return deletedId;
    } catch (error) {
      console.error('할 일을 삭제하는 중 오류 발생:', error);
      return id; // 오류 시 ID 반환
    }
  },

  // 매트릭스 뷰용 할 일 가져오기 (priority 기준 분류로 복구)
  getTasksForMatrix: async () => {
    console.log('TaskService.getTasksForMatrix 호출됨 (priority 기준)');
    
    try {
      const allTasks = await TaskService.getAllTasks();
      console.log('서비스: 매트릭스용 모든 할 일 가져옴', allTasks);
      
      // Priority를 기준으로 4개의 그룹으로 분류
      const tasksByPriority = {
        high: [],
        medium: [],
        low: [],
        none: [] // 'none' 또는 priority가 없는 경우
      };

      allTasks.forEach(task => {
        // priority 값 확인 (undefined, null, 'none' 등 처리)
        const priority = task.priority && ['high', 'medium', 'low'].includes(task.priority) 
                         ? task.priority 
                         : 'none'; 

        if (tasksByPriority[priority]) {
          tasksByPriority[priority].push(task);
        } else {
           // 혹시 모를 예외 처리 (priority 값이 예상과 다른 경우)
           console.warn("알 수 없는 priority 값:", task.priority, "-> 'none'으로 분류");
           tasksByPriority.none.push(task);
        }
      });
      
      console.log('서비스: Priority 기준 분류 완료', tasksByPriority);
      return tasksByPriority;

    } catch (error) {
      console.error('서비스: 매트릭스용 할 일 가져오기 오류', error);
      // 오류 시 빈 객체 반환
      return { high: [], medium: [], low: [], none: [] }; 
    }
  },
  
  // 매트릭스에서 할 일 업데이트 (priority 설정으로 복구)
  updateTaskInMatrix: async (task, targetQuadrant) => { // targetQuadrant 인자 (1: high, 2: medium, 3: low, 4: none)
    console.log('TaskService.updateTaskInMatrix 호출됨:', task, targetQuadrant);
    
    try {
      let newPriority;
      switch (targetQuadrant) {
        case 1: newPriority = 'high'; break;
        case 2: newPriority = 'medium'; break;
        case 3: newPriority = 'low'; break;
        case 4: newPriority = 'none'; break;
        default: newPriority = task.priority; // 변경 없음
      }

      // priority만 업데이트하고 기본 updateTask 호출
      // importance, urgency, quadrant 필드는 이 함수에서 직접 변경하지 않음
      // 필요하다면 updateTask 호출 전에 추가 로직 구현 가능
      const taskToUpdate = { 
        ...task, 
        priority: newPriority
      };
      
      console.log('서비스: 매트릭스 업데이트 -> priority 설정:', newPriority);
      return await TaskService.updateTask(taskToUpdate); 

    } catch (error) {
      console.error('서비스: 매트릭스에서 할 일 업데이트 오류', error);
      return task; // 오류 시 원본 작업 반환
    }
  }
};

export default TaskService; 