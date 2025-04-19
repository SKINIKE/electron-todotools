const Store = require('electron-store');

// 작업 저장소 생성
const taskStore = new Store({
  name: 'tasks', // tasks.json으로 저장됨
  defaults: {
    tasks: [], // 기본값은 빈 배열
  }
});

// 싱글톤 패턴을 위한 레퍼런스
let _lastId = null;

// 새 ID 생성 (마지막 ID보다 1 큰 값)
function generateId() {
  if (_lastId === null) {
    // 저장된 작업에서 가장 큰 ID 찾기
    const tasks = taskStore.get('tasks', []);
    _lastId = tasks.reduce((maxId, task) => Math.max(maxId, task.id || 0), 0);
  }
  return ++_lastId;
}

const TaskStoreService = {
  // 모든 작업 가져오기
  getAllTasks: () => {
    const tasks = taskStore.get('tasks', []);
    // 날짜 문자열을 Date 객체로 변환
    return tasks.map(task => ({
      ...task,
      date: new Date(task.date)
    }));
  },

  // 새 작업 추가
  addTask: (task) => {
    const tasks = taskStore.get('tasks', []);
    const newTask = {
      ...task,
      id: generateId(),
      date: task.date.toISOString() // Date 객체를 문자열로 변환
    };
    
    tasks.push(newTask);
    taskStore.set('tasks', tasks);
    
    // 반환 시 date를 다시 Date 객체로 변환
    return {
      ...newTask,
      date: new Date(newTask.date)
    };
  },

  // 작업 업데이트
  updateTask: (updatedTask) => {
    const tasks = taskStore.get('tasks', []);
    const index = tasks.findIndex(task => task.id === updatedTask.id);
    
    if (index !== -1) {
      // Date 객체를 문자열로 변환
      const taskToStore = {
        ...updatedTask,
        date: updatedTask.date.toISOString()
      };
      
      tasks[index] = taskToStore;
      taskStore.set('tasks', tasks);
      
      // 반환 시 date를 다시 Date 객체로 변환
      return {
        ...taskToStore,
        date: new Date(taskToStore.date)
      };
    }
    
    throw new Error(`ID가 ${updatedTask.id}인 작업을 찾을 수 없습니다.`);
  },

  // 작업 삭제
  deleteTask: (id) => {
    const tasks = taskStore.get('tasks', []);
    const newTasks = tasks.filter(task => task.id !== id);
    
    if (newTasks.length !== tasks.length) {
      taskStore.set('tasks', newTasks);
      return id;
    }
    
    throw new Error(`ID가 ${id}인 작업을 찾을 수 없습니다.`);
  }
};

module.exports = TaskStoreService; 