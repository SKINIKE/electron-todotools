const { ipcRenderer } = window.require ? window.require('electron') : {};

/**
 * 할 일 관리를 위한 서비스
 */
const TaskService = {
  /**
   * 모든 할 일 가져오기
   * @returns {Promise<Array>} 할 일 목록
   */
  getAllTasks: async () => {
    try {
      if (!ipcRenderer) {
        console.warn('Electron IPC를 사용할 수 없습니다. 개발 환경에서는 더미 데이터를 반환합니다.');
        // 개발 환경을 위한 더미 데이터
        return [
          { id: 1, title: '중요하고 긴급한 일 1', completed: false, importance: 'high', urgency: 'high', quadrant: 1, date: new Date().toISOString(), priority: 'high', pinned: false },
          { id: 2, title: '중요하고 긴급한 일 2', completed: true, importance: 'high', urgency: 'high', quadrant: 1, date: new Date().toISOString(), priority: 'high', pinned: false },
          { id: 3, title: '중요하지만 긴급하지 않은 일', completed: false, importance: 'high', urgency: 'low', quadrant: 2, date: new Date().toISOString(), priority: 'high', pinned: false },
          { id: 4, title: '중요하지 않지만 긴급한 일', completed: false, importance: 'low', urgency: 'high', quadrant: 3, date: new Date().toISOString(), priority: 'low', pinned: false },
          { id: 5, title: '중요하지도 긴급하지도 않은 일', completed: false, importance: 'low', urgency: 'low', quadrant: 4, date: new Date().toISOString(), priority: 'low', pinned: false },
        ];
      }
      
      const tasks = await ipcRenderer.invoke('get-all-tasks');
      console.log('모든 할 일을 가져왔습니다:', tasks);
      return tasks;
    } catch (error) {
      console.error('할 일을 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  /**
   * 새 할 일 추가하기
   * @param {Object} task 새 할 일 객체
   * @returns {Promise<Object>} 추가된 할 일 객체
   */
  addTask: async (task) => {
    try {
      if (!ipcRenderer) {
        console.warn('Electron IPC를 사용할 수 없습니다. 개발 환경에서는 더미 응답을 반환합니다.');
        return { ...task, id: Date.now() };
      }
      
      const newTask = await ipcRenderer.invoke('add-task', task);
      console.log('새 할 일이 추가되었습니다:', newTask);
      return newTask;
    } catch (error) {
      console.error('할 일을 추가하는 중 오류 발생:', error);
      throw error;
    }
  },

  /**
   * 할 일 업데이트하기
   * @param {Object} task 업데이트할 할 일 객체
   * @returns {Promise<Object>} 업데이트된 할 일 객체
   */
  updateTask: async (task) => {
    try {
      if (!ipcRenderer) {
        console.warn('Electron IPC를 사용할 수 없습니다. 개발 환경에서는 더미 응답을 반환합니다.');
        return task;
      }
      
      const updatedTask = await ipcRenderer.invoke('update-task', task);
      console.log('할 일이 업데이트되었습니다:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('할 일을 업데이트하는 중 오류 발생:', error);
      throw error;
    }
  },

  /**
   * 할 일 삭제하기
   * @param {number} id 삭제할 할 일 ID
   * @returns {Promise<number>} 삭제된 할 일 ID
   */
  deleteTask: async (id) => {
    try {
      if (!ipcRenderer) {
        console.warn('Electron IPC를 사용할 수 없습니다. 개발 환경에서는 더미 응답을 반환합니다.');
        return id;
      }
      
      const deletedId = await ipcRenderer.invoke('delete-task', id);
      console.log(`ID가 ${deletedId}인 할 일이 삭제되었습니다`);
      return deletedId;
    } catch (error) {
      console.error('할 일을 삭제하는 중 오류 발생:', error);
      throw error;
    }
  },

  // 매트릭스 뷰용 할 일 가져오기
  getTasksForMatrix: async () => {
    try {
      if (!ipcRenderer) {
        throw new Error('Electron IPC를 사용할 수 없습니다');
      }
      const allTasks = await ipcRenderer.invoke('get-all-tasks');
      console.log('서비스: 매트릭스용 할 일 가져옴', allTasks);
      
      // 중요도와 긴급도가 있는 작업만 필터링
      const matrixTasks = allTasks.filter(task => 
        task.importance !== undefined && task.urgency !== undefined);
      
      // 중요도와 긴급도 값이 없는 경우, 기본값 할당
      return matrixTasks.map(task => {
        // 이미 중요도와 긴급도가 있으면 그대로 사용
        if (task.importance && task.urgency) {
          return task;
        }
        
        // 중요도와 긴급도가 없는 경우, priority를 기준으로 할당
        const importance = task.priority === 'high' || task.priority === 'medium' ? 'high' : 'low';
        const urgency = 'low'; // 기본값
        
        // quadrant 계산
        let quadrant;
        if (importance === 'high' && urgency === 'high') {
          quadrant = 1;
        } else if (importance === 'high' && urgency === 'low') {
          quadrant = 2;
        } else if (importance === 'low' && urgency === 'high') {
          quadrant = 3;
        } else {
          quadrant = 4;
        }
        
        return { ...task, importance, urgency, quadrant };
      });
    } catch (error) {
      console.error('서비스: 매트릭스용 할 일 가져오기 오류', error);
      throw error;
    }
  },
  
  // 매트릭스에서 할 일 업데이트 (중요도/긴급도 설정)
  updateTaskInMatrix: async (task) => {
    try {
      if (!ipcRenderer) {
        throw new Error('Electron IPC를 사용할 수 없습니다');
      }
      
      // 매트릭스 뷰 관련 정보가 있는지 확인
      if (task.importance && task.urgency) {
        // quadrant 계산
        let quadrant;
        let priority;
        
        if (task.importance === 'high' && task.urgency === 'high') {
          quadrant = 1;
          priority = 'high';
        } else if (task.importance === 'high' && task.urgency === 'low') {
          quadrant = 2;
          priority = 'medium';
        } else if (task.importance === 'low' && task.urgency === 'high') {
          quadrant = 3;
          priority = 'low';
        } else {
          quadrant = 4;
          priority = 'none';
        }
        
        // quadrant와 priority 업데이트
        const taskToUpdate = { 
          ...task, 
          quadrant,
          priority
        };
        
        console.log('매트릭스 작업 업데이트 준비:', taskToUpdate);
        const updatedTask = await ipcRenderer.invoke('update-task', taskToUpdate);
        console.log('매트릭스 작업 업데이트 성공:', updatedTask);
        return updatedTask;
      }
      
      // 기본 작업 업데이트
      return await TaskService.updateTask(task);
    } catch (error) {
      console.error('서비스: 매트릭스에서 할 일 업데이트 오류', error);
      throw error;
    }
  }
};

export default TaskService; 