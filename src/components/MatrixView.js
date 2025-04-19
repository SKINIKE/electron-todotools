import React, { useState, useEffect, useRef } from 'react';
import { Droppable, Draggable, DragDropContext } from 'react-beautiful-dnd';
import { FaPlus, FaCheck, FaTrash } from 'react-icons/fa';
import { Button, Input, Alert, Spinner } from 'reactstrap';
import TaskService from '../services/TaskService';
import './MatrixView.css';

const MatrixView = () => {
  // 4분면 매트릭스 데이터
  const [matrix, setMatrix] = useState({
    1: [], // 중요하고 긴급한 일 (Quadrant 1)
    2: [], // 중요하지만 긴급하지 않은 일 (Quadrant 2)
    3: [], // 중요하지 않지만 긴급한 일 (Quadrant 3)
    4: [], // 중요하지도 긴급하지도 않은 일 (Quadrant 4)
  });
  
  // 상태 관련
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeQuadrant, setActiveQuadrant] = useState(null);
  
  // 로컬 스토리지 백업용 더미 데이터
  const dummyTasks = [
    { id: 1, title: '중요하고 긴급한 일 1', completed: false, importance: 'high', urgency: 'high', quadrant: 1 },
    { id: 2, title: '중요하고 긴급한 일 2', completed: true, importance: 'high', urgency: 'high', quadrant: 1 },
    { id: 3, title: '중요하지만 긴급하지 않은 일', completed: false, importance: 'high', urgency: 'low', quadrant: 2 },
    { id: 4, title: '중요하지 않지만 긴급한 일', completed: false, importance: 'low', urgency: 'high', quadrant: 3 },
    { id: 5, title: '중요하지도 긴급하지도 않은 일', completed: false, importance: 'low', urgency: 'low', quadrant: 4 },
  ];

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchMatrixTasks();
  }, []);
  
  // 데이터베이스에서 매트릭스 작업 가져오기
  const fetchMatrixTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (window.require) {
        // SQLite 사용
        console.log('매트릭스 작업 로드 시작');
        // 필터링 및 변환을 위한 함수 직접 구현
        const allTasks = await TaskService.getAllTasks();
        console.log('SQLite에서 모든 작업 가져옴:', allTasks);
        
        // 매트릭스 작업에 필요한 필드가 있는 작업만 필터링
        const matrixTasks = allTasks.filter(task => {
          // 이미 매트릭스 속성이 있거나, 변환 가능한 작업만 포함
          return task.quadrant || task.importance || task.urgency || task.priority;
        }).map(task => {
          // 작업에 이미 필요한 속성이 모두 있으면 그대로 사용
          if (task.importance && task.urgency && task.quadrant) {
            return task;
          }
          
          // 속성이 없는 경우 기본값 설정
          const importance = task.importance || (task.priority === 'high' ? 'high' : 'low');
          const urgency = task.urgency || 'low';
          
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
        
        console.log('매트릭스용으로 필터링된 작업:', matrixTasks);
        organizeTasksIntoMatrix(matrixTasks);
      } else {
        // 개발 환경이나 SQLite를 사용할 수 없는 경우 로컬 스토리지 사용
        const savedTasks = localStorage.getItem('matrixTasks');
        if (savedTasks) {
          try {
            const parsedTasks = JSON.parse(savedTasks);
            organizeTasksIntoMatrix(parsedTasks);
            console.log('LocalStorage에서 매트릭스 작업 불러옴:', parsedTasks);
          } catch (error) {
            console.error('LocalStorage에서 매트릭스 작업 불러오기 실패:', error);
            organizeTasksIntoMatrix(dummyTasks);
          }
        } else {
          organizeTasksIntoMatrix(dummyTasks);
          console.log('기본 매트릭스 작업 설정:', dummyTasks);
        }
      }
    } catch (error) {
      console.error('매트릭스 작업 가져오기 오류:', error);
      setError('작업을 가져오는 중 오류가 발생했습니다.');
      
      // 백업으로 로컬 스토리지 사용
      const savedTasks = localStorage.getItem('matrixTasks');
      if (savedTasks) {
        try {
          const parsedTasks = JSON.parse(savedTasks);
          organizeTasksIntoMatrix(parsedTasks);
        } catch (e) {
          organizeTasksIntoMatrix(dummyTasks);
        }
      } else {
        organizeTasksIntoMatrix(dummyTasks);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 작업을 매트릭스에 조직화
  const organizeTasksIntoMatrix = (tasks) => {
    const newMatrix = {
      1: [],
      2: [],
      3: [],
      4: []
    };
    
    tasks.forEach(task => {
      // 작업에 quadrant 속성이 있는 경우에만 매트릭스에 추가
      if (task.quadrant && task.quadrant >= 1 && task.quadrant <= 4) {
        newMatrix[task.quadrant].push(task);
      } else if (task.importance && task.urgency) {
        // quadrant가 없지만 importance와 urgency가 있을 경우
        let quadrant;
        
        if (task.importance === 'high' && task.urgency === 'high') {
          quadrant = 1;
        } else if (task.importance === 'high' && task.urgency === 'low') {
          quadrant = 2;
        } else if (task.importance === 'low' && task.urgency === 'high') {
          quadrant = 3;
        } else if (task.importance === 'low' && task.urgency === 'low' || 
                  task.importance === 'none' || task.urgency === 'none') {
          quadrant = 4;
        } else {
          quadrant = 4; // 기본값
        }
        
        // 계산된 quadrant를 적용하여 작업에 추가
        const taskWithQuadrant = { ...task, quadrant };
        newMatrix[quadrant].push(taskWithQuadrant);
      }
    });
    
    // 각 사분면 내에서 날짜순으로 정렬
    Object.keys(newMatrix).forEach(quadrant => {
      newMatrix[quadrant].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    
    setMatrix(newMatrix);
  };
  
  // 새 작업 추가
  const addTask = async (quadrant) => {
    if (!newTaskTitle.trim()) return;
    
    let importance = 'low';
    let urgency = 'low';
    let priority = 'none';
    
    // quadrant 값에 따라 importance와 urgency, priority 결정
    switch (quadrant) {
      case 1: // 좌상단
        importance = 'high';
        urgency = 'high';
        priority = 'high';
        break;
      case 2: // 우상단
        importance = 'high';
        urgency = 'low';
        priority = 'medium';
        break;
      case 3: // 좌하단
        importance = 'low';
        urgency = 'high';
        priority = 'low';
        break;
      case 4: // 우하단
        importance = 'low';
        urgency = 'low';
        priority = 'none';
        break;
      default:
        importance = 'low';
        urgency = 'low';
        priority = 'none';
        break;
    }
    
    const newTask = {
      title: newTaskTitle,
      completed: false,
      date: new Date().toISOString(),
      priority,
      pinned: false,
      importance,
      urgency,
      quadrant
    };
    
    try {
      if (window.require) {
        // SQLite 사용
        console.log('매트릭스 작업 추가 시작:', newTask);
        const addedTask = await TaskService.addTask(newTask);
        console.log('SQLite에 매트릭스 작업 추가됨:', addedTask);
        
        // 전체 작업 목록 새로고침
        await fetchMatrixTasks();
      } else {
        // 로컬 스토리지 사용
        const taskWithId = { ...newTask, id: Date.now() };
        
        setMatrix(prevMatrix => {
          const updatedMatrix = { ...prevMatrix };
          updatedMatrix[quadrant] = [...updatedMatrix[quadrant], taskWithId];
          
          // 로컬 스토리지에 저장
          const allTasks = [
            ...updatedMatrix[1],
            ...updatedMatrix[2],
            ...updatedMatrix[3],
            ...updatedMatrix[4]
          ];
          localStorage.setItem('matrixTasks', JSON.stringify(allTasks));
          
          return updatedMatrix;
        });
        
        console.log('LocalStorage에 매트릭스 작업 추가됨:', taskWithId);
      }
    } catch (error) {
      console.error('매트릭스 작업 추가 오류:', error);
      setError('작업을 추가하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 사용자 경험을 위해 유지
      const taskWithId = { ...newTask, id: Date.now() };
      
      setMatrix(prevMatrix => {
        const updatedMatrix = { ...prevMatrix };
        updatedMatrix[quadrant] = [...updatedMatrix[quadrant], taskWithId];
        return updatedMatrix;
      });
    }
    
    setNewTaskTitle('');
    setActiveQuadrant(null);
  };
  
  // 작업 완료 상태 토글
  const toggleTaskCompleted = async (taskId, quadrant) => {
    const taskToToggle = matrix[quadrant].find(task => task.id === taskId);
    if (!taskToToggle) return;
    
    const updatedTask = { 
      ...taskToToggle, 
      completed: !taskToToggle.completed 
    };
    
    try {
      if (window.require) {
        // SQLite 사용
        console.log('매트릭스 작업 완료 상태 토글 시작:', updatedTask);
        await TaskService.updateTask(updatedTask);
        console.log('SQLite에서 매트릭스 작업 완료 상태 토글됨:', updatedTask);
        
        // 전체 작업 목록 새로고침
        await fetchMatrixTasks();
      } else {
        // 로컬 스토리지 사용
        const allTasks = [
          ...matrix[1],
          ...matrix[2],
          ...matrix[3],
          ...matrix[4]
        ].map(task => task.id === taskId ? updatedTask : task);
        
        localStorage.setItem('matrixTasks', JSON.stringify(allTasks));
        console.log('LocalStorage에서 매트릭스 작업 완료 상태 토글:', updatedTask);
        
        // UI 업데이트
        setMatrix(prevMatrix => {
          const updatedMatrix = { ...prevMatrix };
          updatedMatrix[quadrant] = updatedMatrix[quadrant].map(task => 
            task.id === taskId ? updatedTask : task
          );
          return updatedMatrix;
        });
      }
    } catch (error) {
      console.error('매트릭스 작업 완료 상태 토글 오류:', error);
      setError('작업 상태를 변경하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 사용자 경험을 위해 유지
      setMatrix(prevMatrix => {
        const updatedMatrix = { ...prevMatrix };
        updatedMatrix[quadrant] = updatedMatrix[quadrant].map(task => 
          task.id === taskId ? updatedTask : task
        );
        return updatedMatrix;
      });
    }
  };
  
  // 작업 삭제
  const deleteTask = async (taskId, quadrant) => {
    try {
      if (window.require) {
        // SQLite 사용
        console.log('매트릭스 작업 삭제 시작, ID:', taskId);
        await TaskService.deleteTask(taskId);
        console.log('SQLite에서 매트릭스 작업 삭제됨, ID:', taskId);
        
        // 전체 작업 목록 새로고침
        await fetchMatrixTasks();
      } else {
        // 로컬 스토리지 사용
        const allTasks = [
          ...matrix[1],
          ...matrix[2],
          ...matrix[3],
          ...matrix[4]
        ].filter(task => task.id !== taskId);
        
        localStorage.setItem('matrixTasks', JSON.stringify(allTasks));
        console.log('LocalStorage에서 매트릭스 작업 삭제됨, ID:', taskId);
        
        // UI 업데이트
        setMatrix(prevMatrix => {
          const updatedMatrix = { ...prevMatrix };
          updatedMatrix[quadrant] = updatedMatrix[quadrant].filter(task => task.id !== taskId);
          return updatedMatrix;
        });
      }
    } catch (error) {
      console.error('매트릭스 작업 삭제 오류:', error);
      setError('작업을 삭제하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 사용자 경험을 위해 유지
      setMatrix(prevMatrix => {
        const updatedMatrix = { ...prevMatrix };
        updatedMatrix[quadrant] = updatedMatrix[quadrant].filter(task => task.id !== taskId);
        return updatedMatrix;
      });
    }
  };
  
  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragStart = (e, task, sourceQuadrant) => {
    console.log('드래그 시작:', task, '소스 사분면:', sourceQuadrant);
    // 작업과 소스 사분면 정보를 함께 저장
    setDraggedTask({ ...task, sourceQuadrant });
    e.dataTransfer.setData('text/plain', JSON.stringify({ ...task, sourceQuadrant }));
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, quadrant) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = async (e, targetQuadrant) => {
    e.preventDefault();
    
    // 드래그된 작업이 없으면 종료
    if (!draggedTask) return;
    
    const sourceQuadrant = draggedTask.sourceQuadrant;
    console.log('드롭:', draggedTask, '소스 사분면:', sourceQuadrant, '타겟 사분면:', targetQuadrant);
    
    // 같은 사분면이면 아무 작업도 하지 않음
    if (sourceQuadrant === targetQuadrant) return;
    
    let importance = 'low';
    let urgency = 'low';
    let priority = 'none';
    
    // 타겟 사분면에 따라 importance와 urgency, priority 결정
    switch (targetQuadrant) {
      case 1: // 좌상단
        importance = 'high';
        urgency = 'high';
        priority = 'high';
        break;
      case 2: // 우상단
        importance = 'high';
        urgency = 'low';
        priority = 'medium';
        break;
      case 3: // 좌하단
        importance = 'low';
        urgency = 'high';
        priority = 'low';
        break;
      case 4: // 우하단
        importance = 'low';
        urgency = 'low';
        priority = 'none';
        break;
      default:
        importance = 'low';
        urgency = 'low';
        priority = 'none';
        break;
    }
    
    // 작업 업데이트 (중요도, 긴급도, 사분면, 우선순위)
    const updatedTask = { 
      ...draggedTask, 
      importance, 
      urgency, 
      quadrant: targetQuadrant,
      priority
    };
    
    // 소스 사분면 속성 제거
    delete updatedTask.sourceQuadrant;
    
    console.log('작업 업데이트:', updatedTask);
    
    try {
      if (window.require) {
        // SQLite 사용
        console.log('매트릭스 작업 위치 업데이트 시작:', updatedTask);
        await TaskService.updateTask(updatedTask);
        console.log('SQLite에서 매트릭스 작업 위치 업데이트됨:', updatedTask);
        
        // 전체 작업 목록 새로고침
        await fetchMatrixTasks();
      } else {
        // 로컬 스토리지 사용
        const allTasks = [
          ...matrix[1],
          ...matrix[2],
          ...matrix[3],
          ...matrix[4]
        ].map(task => task.id === updatedTask.id ? updatedTask : task);
        
        localStorage.setItem('matrixTasks', JSON.stringify(allTasks));
        console.log('LocalStorage에서 매트릭스 작업 위치 업데이트됨:', updatedTask);
        
        // UI 업데이트
        setMatrix(prevMatrix => {
          const updatedMatrix = { ...prevMatrix };
          
          // 소스 사분면에서 작업 제거
          updatedMatrix[sourceQuadrant] = updatedMatrix[sourceQuadrant].filter(
            task => task.id !== draggedTask.id
          );
          
          // 타겟 사분면에 작업 추가
          updatedMatrix[targetQuadrant] = [...updatedMatrix[targetQuadrant], updatedTask];
          
          return updatedMatrix;
        });
      }
    } catch (error) {
      console.error('매트릭스 작업 이동 오류:', error);
      setError('작업을 이동하는 중 오류가 발생했습니다.');
      
      // UI 업데이트는 사용자 경험을 위해 유지
      setMatrix(prevMatrix => {
        const updatedMatrix = { ...prevMatrix };
        
        // 소스 사분면에서 작업 제거
        updatedMatrix[sourceQuadrant] = updatedMatrix[sourceQuadrant].filter(
          task => task.id !== draggedTask.id
        );
        
        // 타겟 사분면에 작업 추가
        updatedMatrix[targetQuadrant] = [...updatedMatrix[targetQuadrant], updatedTask];
        
        return updatedMatrix;
      });
    }
    
    // 드래그된 작업 초기화
    setDraggedTask(null);
  };
  
  // 사분면 제목
  const quadrantTitles = {
    1: '중요하고 긴급한 일 (우선순위: 높음)',
    2: '중요하지만 긴급하지 않은 일 (우선순위: 중간)',
    3: '중요하지 않지만 긴급한 일 (우선순위: 낮음)',
    4: '중요하지도 긴급하지도 않은 일 (우선순위: 없음)'
  };
  
  // 사분면 테두리 색상
  const quadrantBorderColors = {
    1: '#ffcccc', // 빨간색 계열 (높음)
    2: '#ffffcc', // 노란색 계열 (중간)
    3: '#ccffcc', // 녹색 계열 (낮음)
    4: '#ccccff'  // 파란색 계열 (없음)
  };

  return (
    <div className="matrix-view-container">
      <h1>아이젠하워 매트릭스</h1>
      
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
      {loading ? (
        <div className="loading-container">
          <p>데이터를 불러오는 중...</p>
        </div>
      ) : (
        <div className="matrix-grid">
          {[1, 2, 3, 4].map(quadrant => (
            <div 
              key={quadrant}
              className="matrix-quadrant"
              style={{ backgroundColor: 'white', borderColor: quadrantBorderColors[quadrant] }}
              onDragOver={(e) => handleDragOver(e, quadrant)}
              onDrop={(e) => handleDrop(e, quadrant)}
            >
              <h3>{quadrantTitles[quadrant]}</h3>
              
              <div className="task-list">
                {matrix[quadrant].map(task => (
                  <div
                    key={task.id}
                    className={`task-item ${task.completed ? 'completed' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task, quadrant)}
                  >
                    <div className="checkbox" onClick={() => toggleTaskCompleted(task.id, quadrant)}>
                      <i className="material-icons">
                        {task.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </i>
                    </div>
                    <span className="task-title">{task.title}</span>
                    <button className="delete-btn" onClick={() => deleteTask(task.id, quadrant)}>
                      <i className="material-icons">delete</i>
                    </button>
                  </div>
                ))}
              </div>
              
              {activeQuadrant === quadrant ? (
                <div className="add-task-form">
                  <input
                    type="text"
                    placeholder="새 작업 추가..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTask(quadrant);
                      } else if (e.key === 'Escape') {
                        setActiveQuadrant(null);
                        setNewTaskTitle('');
                      }
                    }}
                  />
                  <div className="add-task-actions">
                    <button onClick={() => addTask(quadrant)}>추가</button>
                    <button className="cancel-btn" onClick={() => {
                      setActiveQuadrant(null);
                      setNewTaskTitle('');
                    }}>취소</button>
                  </div>
                </div>
              ) : (
                <button className="add-task-btn" onClick={() => setActiveQuadrant(quadrant)}>
                  <i className="material-icons">add</i> 작업 추가
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatrixView; 