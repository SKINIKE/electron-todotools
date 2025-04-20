import React, { useState, useEffect, useCallback } from 'react';
import TaskService from '../services/TaskService';
import TaskModal from './AddTaskModal'; // 이름 변경된 모달 import
import { FaEdit, FaTrashAlt, FaPlus, FaThumbtack } from 'react-icons/fa';

const TaskList = ({ showTodayOnly, showPinnedOnly }) => {
  // 할 일 목록 상태
  const [tasks, setTasks] = useState([]);
  // 새 할 일 입력 상태 (모달에서 관리하도록 변경될 수 있음)
  const [newTaskText, setNewTaskText] = useState(''); 
  // 할 일 추가 모달 상태 복구
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 통합
  // 할 일 수정 모달 상태 (수정 기능 복구 시 필요)
  const [currentTask, setCurrentTask] = useState(null); // 수정할 작업 상태 복구
  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');
  // 새 할 일 날짜 (모달에서 관리하도록 변경될 수 있음)
  const [newTaskDate, setNewTaskDate] = useState(''); 
  // 새 할 일 중요도 (모달에서 관리하도록 변경될 수 있음)
  const [newTaskPriority, setNewTaskPriority] = useState('none'); 
  // 새 할 일 고정 여부 (모달에서 관리하도록 변경될 수 있음)
  const [newTaskPinned, setNewTaskPinned] = useState(false); 
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  // 오류 메시지
  const [error, setError] = useState(null);
  // 새로고침 트리거 상태
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 가상의 할 일 목록 (실제로는 DB에서 가져올 예정)
  // ... (dummyTasks 제거 또는 유지)

  // 데이터 로드 함수 (useCallback으로 감싸기)
  const loadTasks = useCallback(async () => {
    console.log('TaskList: 작업 목록 로드 시작');
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTasks = await TaskService.getAllTasks();
      console.log('TaskList: 작업 목록 로드 완료:', fetchedTasks);
      // 날짜 필터링 적용 (데이터 로드 시)
      const filteredTasks = filterTasks(fetchedTasks, searchQuery, showTodayOnly, showPinnedOnly);
      setTasks(filteredTasks);
    } catch (err) {
      console.error('TaskList: 작업 목록 로드 오류:', err);
      setError('작업 목록을 불러오는 데 실패했습니다.');
      setTasks([]); // 오류 시 빈 배열로 설정
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, showTodayOnly, showPinnedOnly]);

  // 컴포넌트 마운트 시 및 필터/새로고침 키 변경 시 데이터 로드
  useEffect(() => {
    loadTasks();
  }, [loadTasks, refreshKey]);

  // 'tasks-updated' 이벤트 리스너 추가 (컴포넌트 마운트 시)
  useEffect(() => {
    const handleTasksUpdated = () => {
      console.log('TaskList: tasks-updated 이벤트 수신, 목록 새로고침');
      setRefreshKey(prevKey => prevKey + 1); // 새로고침 트리거 상태 변경
    };

    if (window.electronAPI) { // electronAPI 존재 확인
       // 이벤트 리스너 등록 로직 필요 (preload.js에 추가해야 함)
       // 예시: const unsubscribe = window.electronAPI.onTasksUpdated(handleTasksUpdated);
       // 여기서는 preload.js 수정 없이 임시로 ipcRenderer 직접 사용 (권장되지 않음)
       const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
       if (ipcRenderer) {
           console.log('TaskList: ipcRenderer 이벤트 리스너 등록');
           ipcRenderer.on('tasks-updated', handleTasksUpdated);
           // 컴포넌트 언마운트 시 리스너 제거
           return () => {
               console.log('TaskList: ipcRenderer 이벤트 리스너 제거');
               ipcRenderer.removeListener('tasks-updated', handleTasksUpdated);
           };
       } else {
           console.warn('TaskList: ipcRenderer 사용 불가');
       }
    }

  }, []); // 마운트 시 한 번만 실행

  // 필터링 함수
  const filterTasks = (tasksToFilter, term, todayOnly, pinnedOnly) => {
    let filtered = tasksToFilter;

    // 검색어 필터링
    if (term) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(term.toLowerCase())
      );
    }
    
    // 오늘 할 일 필터링 (Date 객체 비교로 수정)
    if (todayOnly) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // 오늘 날짜 자정
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // 오늘 날짜 마지막 밀리초

      filtered = filtered.filter(task => {
        // task.date가 유효한 Date 객체인지 확인 후 비교
        return task.date && task.date instanceof Date && 
               task.date >= todayStart && task.date <= todayEnd;
      });
    }

    // 고정된 할 일 필터링
    if (pinnedOnly) {
      filtered = filtered.filter(task => task.pinned);
    }

    return filtered;
  };

  // 검색어 변경 시 필터링 다시 적용
  useEffect(() => {
    // 검색어 변경 시에는 새로 로드할 필요 없이 기존 tasks 상태를 필터링
    // loadTasks() 대신 별도 필터링 로직 실행 (하지만 현재 loadTasks 의존성에 searchTerm 포함됨)
    // loadTasks()를 호출하여 필터링된 결과를 다시 가져오도록 유지
  }, [searchQuery, showTodayOnly, showPinnedOnly]); // loadTasks 의존성 변경 시 자동 재실행됨

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

  // 할 일 추가 모달 열기
  const openAddModal = () => {
    setCurrentTask(null); // 추가 모드: currentTask를 null로 설정
    setIsModalOpen(true);
  };

  // 할 일 수정 모달 열기 함수 복구
  const openEditModal = (task) => {
    setCurrentTask(task); // 수정 모드: currentTask를 선택된 작업으로 설정
    setIsModalOpen(true);
  };

  // 할 일 저장 함수 (추가/수정 통합)
  const handleSaveTask = async (taskData) => { 
    console.log("TaskList: handleSaveTask 호출됨", taskData);
    setError(null); // 이전 오류 메시지 초기화

    try {
      if (taskData.id) { // ID가 있으면 수정
        // taskData에는 모달에서 입력된 값이 들어옴 (completed 포함)
        const taskToUpdate = {
            ...taskData, // id, title, date, priority, pinned, completed
            date: taskData.date ? new Date(taskData.date) : new Date(), // Date 객체로
            // 매트릭스 관련 필드 업데이트 (TaskService에서 처리하도록 위임 가능)
            importance: taskData.priority === 'high' || taskData.priority === 'medium' ? 'high' : 'low',
            urgency: currentTask?.urgency || 'low', // 기존 urgency 유지 또는 기본값
            quadrant: taskData.priority === 'high' || taskData.priority === 'medium' ? 2 : 4
        };
        console.log("수정할 작업:", taskToUpdate);
        await TaskService.updateTask(taskToUpdate);
        console.log('할 일 수정 성공');
      } else { // ID가 없으면 추가
        const newTask = {
          title: taskData.title.trim(),
          completed: false, // 추가 시에는 항상 false
          date: taskData.date ? new Date(taskData.date) : new Date(),
          priority: taskData.priority || 'none',
          pinned: taskData.pinned || false,
          importance: taskData.priority === 'high' || taskData.priority === 'medium' ? 'high' : 'low',
          urgency: 'low',
          quadrant: taskData.priority === 'high' || taskData.priority === 'medium' ? 2 : 4
        };
        console.log("추가할 작업:", newTask);
        await TaskService.addTask(newTask);
        console.log('할 일 추가 성공');
      }
      setRefreshKey(prevKey => prevKey + 1); // 성공 시 목록 새로고침
    } catch (error) {
      console.error('할 일 저장 오류:', error);
      setError('할 일 저장 중 오류가 발생했습니다.');
    } finally {
      setIsModalOpen(false); // 모달 닫기
      setCurrentTask(null); // currentTask 초기화
    }
  };

  // 모달 닫기 함수
  const handleCloseModal = () => {
      setIsModalOpen(false);
      setCurrentTask(null); // 모달 닫을 때 currentTask 초기화
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
      // TaskService를 통해 할 일 업데이트
      await TaskService.updateTask(updatedTask);
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      console.log('할 일 완료 상태 토글됨:', updatedTask);
    } catch (error) {
      console.error('할 일 완료 상태 토글 오류:', error);
      setError('할 일 상태를 변경하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 유지
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
      // TaskService를 통해 할 일 업데이트
      await TaskService.updateTask(updatedTask);
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      console.log('할 일 고정 상태 토글됨:', updatedTask);
    } catch (error) {
      console.error('할 일 고정 상태 토글 오류:', error);
      setError('할 일 고정 상태를 변경하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 유지
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
    }
  };

  // 할 일 삭제 함수
  const deleteTask = async (taskId) => {
    try {
      // TaskService를 통해 할 일 삭제
      await TaskService.deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      console.log('할 일 삭제됨, ID:', taskId);
    } catch (error) {
      console.error('할 일 삭제 오류:', error);
      setError('할 일을 삭제하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 유지
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

  // 로딩 및 오류 상태 표시
  if (isLoading) {
    return <div className="loading-indicator">로딩 중...</div>;
  }

  if (error) {
    return <div className="error-message">오류: {error}</div>;
  }

  return (
    <div className="task-list-container">
      <div className="flex justify-between items-center mb-16">
        <h1>{showTodayOnly ? '오늘 할 일' : (showPinnedOnly ? '고정된 할 일' : '모든 할 일')}</h1>
        {/* 새 할 일 버튼 복구 */}
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
      
      {/* 할 일 목록 */}
      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-list">
            <p>할 일이 없습니다.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`todo-item ${task.completed ? 'completed' : ''}`}>
              <div className="checkbox" onClick={() => toggleTaskCompleted(task.id)}>
                <i className="material-icons">
                  {task.completed ? 'check_circle' : 'radio_button_unchecked'}
                </i>
              </div>
              <div className="todo-content" onClick={() => openEditModal(task)}>
                <div className="todo-text">{task.title}</div>
                <div className="todo-metadata">
                  {task.date instanceof Date ? formatDate(task.date) : '날짜 없음'} {priorityBadge(task.priority)}
                </div>
              </div>
              <div className="todo-actions">
                <button 
                  className={`secondary ${task.pinned ? 'pinned' : ''}`} 
                  onClick={(e) => { e.stopPropagation(); toggleTaskPinned(task.id); }}
                >
                  <i className="material-icons">
                    {task.pinned ? 'push_pin' : 'push_pin'}
                  </i>
                </button>
                <button className="secondary" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
                  <i className="material-icons">delete</i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 통합된 모달 렌더링 */}
      {isModalOpen && 
        <TaskModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          onSaveTask={handleSaveTask} // onAddTask 대신 onSaveTask 전달
          taskToEdit={currentTask} // 수정할 작업 데이터 전달 (추가 시 null)
        />
      }
    </div>
  );
};

export default TaskList; 