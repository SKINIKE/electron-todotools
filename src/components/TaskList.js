import React, { useState, useEffect } from 'react';
import TaskService from '../services/TaskService';

const TaskList = ({ showTodayOnly, showPinnedOnly }) => {
  // 할 일 목록 상태
  const [tasks, setTasks] = useState([]);
  // 새 할 일 입력 상태
  const [newTaskText, setNewTaskText] = useState('');
  // 할 일 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // 할 일 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');
  // 현재 수정 중인 할 일
  const [currentTask, setCurrentTask] = useState(null);
  // 새 할 일 날짜
  const [newTaskDate, setNewTaskDate] = useState('');
  // 새 할 일 중요도
  const [newTaskPriority, setNewTaskPriority] = useState('none');
  // 새 할 일 고정 여부
  const [newTaskPinned, setNewTaskPinned] = useState(false);
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  // 오류 메시지
  const [error, setError] = useState(null);
  
  // 가상의 할 일 목록 (실제로는 DB에서 가져올 예정)
  const dummyTasks = [
    { id: 1, title: '리액트 컴포넌트 작성하기', completed: false, date: new Date(), priority: 'high', pinned: true },
    { id: 2, title: '일렉트론 앱 빌드하기', completed: false, date: new Date(), priority: 'medium', pinned: false },
    { id: 3, title: 'CSS 스타일 적용하기', completed: true, date: new Date(Date.now() - 86400000), priority: 'low', pinned: false },
    { id: 4, title: '패키징 스크립트 작성하기', completed: false, date: new Date(Date.now() + 86400000), priority: 'high', pinned: false },
  ];
  
  // 컴포넌트 마운트 시 할 일 목록 가져오기
  useEffect(() => {
    fetchTasks();
  }, []);

  // 데이터베이스에서 할 일 목록 가져오기
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // SQLite 사용 시
      if (window.require) {
        const tasks = await TaskService.getAllTasks();
        console.log('SQLite에서 할 일 가져옴:', tasks);
        setTasks(tasks);
      } else {
        // 개발 환경이나 SQLite를 사용할 수 없는 경우 로컬 스토리지 사용
        const savedTasks = localStorage.getItem('todoTasks');
        if (savedTasks) {
          try {
            const parsedTasks = JSON.parse(savedTasks);
            // 날짜 문자열을 Date 객체로 변환
            const formattedTasks = parsedTasks.map(task => ({
              ...task,
              date: new Date(task.date)
            }));
            setTasks(formattedTasks);
            console.log('LocalStorage에서 할 일 불러옴:', formattedTasks);
          } catch (error) {
            console.error('LocalStorage에서 할 일 불러오기 실패:', error);
            setTasks(dummyTasks);
          }
        } else {
          setTasks(dummyTasks);
          console.log('기본 할 일 목록 설정:', dummyTasks);
        }
      }
    } catch (error) {
      console.error('할 일 가져오기 오류:', error);
      setError('할 일을 가져오는 중 오류가 발생했습니다.');
      
      // 백업으로 로컬 스토리지 사용
      const savedTasks = localStorage.getItem('todoTasks');
      if (savedTasks) {
        try {
          const parsedTasks = JSON.parse(savedTasks);
          const formattedTasks = parsedTasks.map(task => ({
            ...task,
            date: new Date(task.date)
          }));
          setTasks(formattedTasks);
        } catch (e) {
          setTasks(dummyTasks);
        }
      } else {
        setTasks(dummyTasks);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜를 YYYY-MM-DD 형식으로 변환
  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  // 일반 문자열로 날짜 표시
  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('ko-KR', options);
  };

  // 할 일 추가 모달 초기화
  const openAddModal = () => {
    setNewTaskText('');
    setNewTaskDate(formatDateForInput(new Date()));
    setNewTaskPriority('none');
    setNewTaskPinned(false);
    setIsAddModalOpen(true);
  };

  // 할 일 수정 모달 초기화
  const openEditModal = (task) => {
    setCurrentTask(task);
    setNewTaskText(task.title);
    setNewTaskDate(formatDateForInput(task.date));
    setNewTaskPriority(task.priority || 'none');
    setNewTaskPinned(task.pinned);
    setIsEditModalOpen(true);
  };

  // 필터링된 할 일 목록
  const filteredTasks = tasks.filter(task => {
    // 먼저 검색어로 필터링
    if (searchQuery.trim() !== '') {
      if (!task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    // 오늘 할 일만 보기
    if (showTodayOnly) {
      const today = new Date();
      const taskDate = new Date(task.date);
      return (
        taskDate.getDate() === today.getDate() &&
        taskDate.getMonth() === today.getMonth() &&
        taskDate.getFullYear() === today.getFullYear()
      );
    }
    
    // 고정된 할 일만 보기
    if (showPinnedOnly) {
      return task.pinned;
    }
    
    // 모든 할 일
    return true;
  });

  // 할 일 추가 함수
  const addTask = async () => {
    if (newTaskText.trim() === '') return;
    
    // 우선순위 기반으로 매트릭스 속성 설정
    let importance = 'low';
    let urgency = 'low';
    let quadrant = 4;
    
    switch(newTaskPriority) {
      case 'high':
        importance = 'high';
        urgency = 'high';
        quadrant = 1;
        break;
      case 'medium':
        importance = 'high';
        urgency = 'low';
        quadrant = 2;
        break;
      case 'low':
        importance = 'low';
        urgency = 'high';
        quadrant = 3;
        break;
      case 'none':
      default:
        importance = 'low';
        urgency = 'low';
        quadrant = 4;
        break;
    }
    
    const newTask = {
      title: newTaskText,
      completed: false,
      date: newTaskDate ? new Date(newTaskDate) : new Date(),
      priority: newTaskPriority,
      pinned: newTaskPinned,
      // 매트릭스 뷰 관련 속성 추가
      importance: importance,
      urgency: urgency,
      quadrant: quadrant
    };
    
    try {
      if (window.require) {
        // SQLite 사용
        const addedTask = await TaskService.addTask(newTask);
        setTasks([...tasks, addedTask]);
        console.log('SQLite에 할 일 추가됨:', addedTask);
      } else {
        // 로컬 스토리지 사용
        const taskWithId = { ...newTask, id: Date.now() };
        const updatedTasks = [...tasks, taskWithId];
        setTasks(updatedTasks);
        localStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
        console.log('LocalStorage에 할 일 추가됨:', taskWithId);
      }
    } catch (error) {
      console.error('할 일 추가 오류:', error);
      setError('할 일을 추가하는 중 오류가 발생했습니다.');
      
      // 로컬 스토리지에 백업
      const taskWithId = { ...newTask, id: Date.now() };
      const updatedTasks = [...tasks, taskWithId];
      setTasks(updatedTasks);
      localStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
    }
    
    setIsAddModalOpen(false);
  };

  // 할 일 수정 함수
  const updateTask = async () => {
    if (newTaskText.trim() === '') return;
    
    // 우선순위 기반으로 매트릭스 속성 설정
    let importance = 'low';
    let urgency = 'low';
    let quadrant = 4;
    
    switch(newTaskPriority) {
      case 'high':
        importance = 'high';
        urgency = 'high';
        quadrant = 1;
        break;
      case 'medium':
        importance = 'high';
        urgency = 'low';
        quadrant = 2;
        break;
      case 'low':
        importance = 'low';
        urgency = 'high';
        quadrant = 3;
        break;
      case 'none':
      default:
        importance = 'low';
        urgency = 'low';
        quadrant = 4;
        break;
    }
    
    const updatedTask = {
      ...currentTask,
      title: newTaskText,
      date: newTaskDate ? new Date(newTaskDate) : new Date(),
      priority: newTaskPriority,
      pinned: newTaskPinned,
      importance: importance,
      urgency: urgency,
      quadrant: quadrant
    };
    
    try {
      if (window.require) {
        // SQLite 사용
        await TaskService.updateTask(updatedTask);
        setTasks(tasks.map(task => task.id === currentTask.id ? updatedTask : task));
        console.log('SQLite에서 할 일 업데이트됨:', updatedTask);
      } else {
        // 로컬 스토리지 사용
        const updatedTasks = tasks.map(task => task.id === currentTask.id ? updatedTask : task);
        setTasks(updatedTasks);
        localStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
        console.log('LocalStorage에서 할 일 업데이트됨:', updatedTask);
      }
    } catch (error) {
      console.error('할 일 업데이트 오류:', error);
      setError('할 일을 업데이트하는 중 오류가 발생했습니다.');
      
      // 로컬 스토리지에 백업
      const updatedTasks = tasks.map(task => task.id === currentTask.id ? updatedTask : task);
      setTasks(updatedTasks);
      localStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
    }
    
    setIsEditModalOpen(false);
  };

  // 할 일 완료 상태 토글 함수
  const toggleTaskCompleted = async (taskId) => {
    const taskToToggle = tasks.find(task => task.id === taskId);
    if (!taskToToggle) return;
    
    const updatedTask = { 
      ...taskToToggle, 
      completed: !taskToToggle.completed 
    };
    
    try {
      if (window.require) {
        // SQLite 사용
        await TaskService.updateTask(updatedTask);
        setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
        console.log('SQLite에서 할 일 완료 상태 토글:', updatedTask);
      } else {
        // 로컬 스토리지 사용
        const updatedTasks = tasks.map(task => task.id === taskId ? updatedTask : task);
        setTasks(updatedTasks);
        localStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
        console.log('LocalStorage에서 할 일 완료 상태 토글:', updatedTask);
      }
    } catch (error) {
      console.error('할 일 완료 상태 토글 오류:', error);
      setError('할 일 상태를 변경하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 사용자 경험을 위해 유지
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
    }
  };

  // 할 일 고정 상태 토글 함수
  const toggleTaskPinned = async (taskId) => {
    const taskToToggle = tasks.find(task => task.id === taskId);
    if (!taskToToggle) return;
    
    const updatedTask = { 
      ...taskToToggle, 
      pinned: !taskToToggle.pinned 
    };
    
    try {
      if (window.require) {
        // SQLite 사용
        await TaskService.updateTask(updatedTask);
        setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
        console.log('SQLite에서 할 일 고정 상태 토글:', updatedTask);
      } else {
        // 로컬 스토리지 사용
        const updatedTasks = tasks.map(task => task.id === taskId ? updatedTask : task);
        setTasks(updatedTasks);
        localStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
        console.log('LocalStorage에서 할 일 고정 상태 토글:', updatedTask);
      }
    } catch (error) {
      console.error('할 일 고정 상태 토글 오류:', error);
      setError('할 일 고정 상태를 변경하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 사용자 경험을 위해 유지
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
    }
  };

  // 할 일 삭제 함수
  const deleteTask = async (taskId) => {
    try {
      if (window.require) {
        // SQLite 사용
        await TaskService.deleteTask(taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
        console.log('SQLite에서 할 일 삭제됨, ID:', taskId);
      } else {
        // 로컬 스토리지 사용
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        setTasks(updatedTasks);
        localStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
        console.log('LocalStorage에서 할 일 삭제됨, ID:', taskId);
      }
    } catch (error) {
      console.error('할 일 삭제 오류:', error);
      setError('할 일을 삭제하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 사용자 경험을 위해 유지
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  // 우선순위 배지 스타일 및 텍스트
  const priorityBadge = (priority) => {
    let style = {};
    let text = '';
    
    switch(priority) {
      case 'high':
        style = { backgroundColor: '#e74c3c' };
        text = '높음';
        break;
      case 'medium':
        style = { backgroundColor: '#f39c12' };
        text = '중간';
        break;
      case 'low':
        style = { backgroundColor: '#27ae60' };
        text = '낮음';
        break;
      case 'none':
        style = { backgroundColor: '#95a5a6', opacity: 0.7 };
        text = '선택안함';
        break;
      default:
        style = { backgroundColor: '#95a5a6' };
        text = '없음';
    }
    
    return (
      <span className="priority-badge" style={style}>{text}</span>
    );
  };

  return (
    <div className="task-list-container">
      <div className="flex justify-between items-center mb-16">
        <h1>{showTodayOnly ? '오늘 할 일' : (showPinnedOnly ? '고정된 할 일' : '모든 할 일')}</h1>
        <button onClick={openAddModal}>
          <i className="material-icons">add</i> 새 할 일
        </button>
      </div>

      {/* 검색 바 */}
      <div className="search-bar mb-16">
        <div className="search-input-container">
          <i className="material-icons">search</i>
          <input
            type="text"
            placeholder="할 일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <i className="material-icons">close</i>
            </button>
          )}
        </div>
      </div>
      
      {/* 오류 메시지 */}
      {error && (
        <div className="error-message mb-16">
          <i className="material-icons">error</i>
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <i className="material-icons">close</i>
          </button>
        </div>
      )}
      
      {/* 로딩 상태 */}
      {isLoading ? (
        <div className="loading-container">
          <p>데이터를 불러오는 중...</p>
        </div>
      ) : (
        /* 할 일 목록 */
        <div className="card">
          {filteredTasks.length === 0 ? (
            <div className="empty-list">
              <p>할 일이 없습니다.</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className={`todo-item ${task.completed ? 'completed' : ''}`}>
                <div className="checkbox" onClick={() => toggleTaskCompleted(task.id)}>
                  <i className="material-icons">
                    {task.completed ? 'check_circle' : 'radio_button_unchecked'}
                  </i>
                </div>
                <div className="todo-content" onClick={() => openEditModal(task)}>
                  <div className="todo-text">{task.title}</div>
                  <div className="todo-metadata">
                    {formatDate(task.date)} {priorityBadge(task.priority)}
                  </div>
                </div>
                <div className="todo-actions">
                  <button 
                    className={`secondary ${task.pinned ? 'pinned' : ''}`} 
                    onClick={() => toggleTaskPinned(task.id)}
                  >
                    <i className="material-icons">
                      {task.pinned ? 'push_pin' : 'push_pin'}
                    </i>
                  </button>
                  <button className="secondary" onClick={() => deleteTask(task.id)}>
                    <i className="material-icons">delete</i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* 할 일 추가 모달 */}
      {isAddModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>새 할 일 추가</h2>
            
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                placeholder="할 일 내용"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>날짜</label>
              <input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>중요도</label>
              <select 
                value={newTaskPriority} 
                onChange={(e) => setNewTaskPriority(e.target.value)}
              >
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
                <option value="none">선택안함</option>
              </select>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={newTaskPinned}
                  onChange={(e) => setNewTaskPinned(e.target.checked)}
                />
                고정하기
              </label>
            </div>
            
            <div className="modal-actions">
              <button onClick={addTask}>추가</button>
              <button className="secondary" onClick={() => setIsAddModalOpen(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
      
      {/* 할 일 수정 모달 */}
      {isEditModalOpen && currentTask && (
        <div className="modal">
          <div className="modal-content">
            <h2>할 일 수정</h2>
            
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                placeholder="할 일 내용"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>날짜</label>
              <input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>중요도</label>
              <select 
                value={newTaskPriority} 
                onChange={(e) => setNewTaskPriority(e.target.value)}
              >
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
                <option value="none">선택안함</option>
              </select>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={newTaskPinned}
                  onChange={(e) => setNewTaskPinned(e.target.checked)}
                />
                고정하기
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={currentTask.completed}
                  onChange={(e) => {
                    setCurrentTask({...currentTask, completed: e.target.checked});
                  }}
                />
                완료됨
              </label>
            </div>
            
            <div className="modal-actions">
              <button onClick={updateTask}>저장</button>
              <button className="secondary" onClick={() => setIsEditModalOpen(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList; 