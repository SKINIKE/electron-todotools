import React, { useState, useEffect, useCallback } from 'react';
// import { Droppable, Draggable, DragDropContext } from 'react-beautiful-dnd'; // 기본 HTML 드래그앤드롭 사용
import { FaPlus, FaCheck, FaTrash, FaEdit } from 'react-icons/fa';
import { Button, Input, Alert, Spinner } from 'reactstrap';
import TaskService from '../services/TaskService';
import TaskModal from './AddTaskModal';
// import './MatrixView.css'; // CSS 파일이 있다면 유지

// 우선순위별 테두리 색상 정의
const quadrantBorderColors = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
  none: 'blue'
};

const MatrixView = () => {
  // 상태: 우선순위별 작업 목록 (복구)
  const [tasksByPriority, setTasksByPriority] = useState({ 
    high: [], 
    medium: [], 
    low: [], 
    none: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // 새로고침 트리거

  // 데이터 로드 함수 (복구)
  const loadMatrixTasks = useCallback(async () => {
    console.log('MatrixView: 작업 로드 시작 (priority 기준)');
    setIsLoading(true);
    setError(null);
    try {
      const data = await TaskService.getTasksForMatrix(); // 복구된 함수 호출
      console.log('MatrixView: 작업 로드 완료 (priority 기준)', data);
      setTasksByPriority(data); // 상태 업데이트 (키: high, medium, low, none)
    } catch (err) {
      console.error('MatrixView: 작업 로드 오류:', err);
      setError('매트릭스 데이터를 불러오는 데 실패했습니다.');
      setTasksByPriority({ high: [], medium: [], low: [], none: [] }); // 오류 시 초기화
    } finally {
      setIsLoading(false);
    }
  }, []); // 의존성 없음 (마운트 시 한 번)

  // 컴포넌트 마운트 시 및 새로고침 시 데이터 로드
  useEffect(() => {
    loadMatrixTasks();
  }, [loadMatrixTasks, refreshKey]);

  // 날짜 포맷 함수
  const formatDate = (date) => {
    if (!date || !(date instanceof Date)) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ko-KR', options);
  };

  // 모달 열기 (수정 전용)
  const openEditModal = (task) => {
    setCurrentTask(task);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentTask(null);
  };

  // 할 일 저장 (수정 완료 후 목록 새로고침)
  const handleSaveTask = async (taskData) => {
    console.log("MatrixView: handleSaveTask 호출됨", taskData);
    setError(null);
    try {
      const taskToUpdate = { 
          ...taskData, 
          date: taskData.date ? new Date(taskData.date) : new Date(),
      };
      await TaskService.updateTask(taskToUpdate);
      setRefreshKey(prev => prev + 1); // 목록 새로고침
    } catch (error) {
      console.error('할 일 저장 오류:', error);
      setError('할 일 저장 중 오류가 발생했습니다.');
    } finally {
      setIsModalOpen(false);
      setCurrentTask(null);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e, task) => {
    console.log('Drag Start:', task.id);
    // 드래그되는 작업의 ID만 저장
    e.dataTransfer.setData('taskId', task.id.toString()); 
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetPriority) => { // targetPriority는 문자열 (high, medium, low, none)
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    console.log(`Drop: Task ID ${taskId} -> Priority ${targetPriority}`);

    if (!taskId) return;

    // 기존 작업 및 우선순위 찾기
    let originalTask = null;
    let originalPriority = null;
    for (const priority in tasksByPriority) {
        const foundTask = tasksByPriority[priority].find(t => t.id === taskId);
        if (foundTask) {
            originalTask = foundTask;
            originalPriority = priority;
            break;
        }
    }

    if (!originalTask || originalPriority === targetPriority) {
      console.log('이동할 작업이 없거나 같은 그룹으로 이동.');
      return; 
    }

    // TaskService를 통해 priority 업데이트
    setError(null);
    try {
        // 우선순위 문자열을 숫자로 매핑 (TaskService 기대값)
        let targetQuadrantNum = 1; // high
        if(targetPriority === 'medium') targetQuadrantNum = 2;
        else if(targetPriority === 'low') targetQuadrantNum = 3;
        else if(targetPriority === 'none') targetQuadrantNum = 4;

        await TaskService.updateTaskInMatrix(originalTask, targetQuadrantNum);
        setRefreshKey(prev => prev + 1); // 업데이트 후 목록 새로고침
    } catch(err) {
        console.error("드롭 처리 오류:", err);
        setError('작업 이동 중 오류 발생');
    }
  };

  // 로딩 및 오류 표시
  if (isLoading) return <div className="loading-indicator">로딩 중...</div>;
  if (error) return <div className="error-message">오류: {error}</div>;

  // 사분면 헤더 정보 정의 (복구)
  const quadrantInfo = {
    high: { title: '중요도 높음', description: '가장 먼저 처리해야 할 일' },
    medium: { title: '중요도 중간', description: '계획을 세워 처리할 일' },
    low: { title: '중요도 낮음', description: '위임하거나 나중에 처리할 일' },
    none: { title: '중요도 선택안함', description: '제거하거나 최소화할 일' }
  };

  // 각 사분면 렌더링 함수 (복구 및 테두리 색상 적용)
  const renderQuadrant = (priority) => {
    const { title, description } = quadrantInfo[priority];
    const tasks = tasksByPriority[priority] || [];

    return (
      <div 
        className="matrix-quadrant" 
        onDragOver={handleDragOver} 
        onDrop={(e) => handleDrop(e, priority)} // 우선순위 문자열 전달
        style={{ 
          border: `2px solid ${quadrantBorderColors[priority]}`, // 테두리 색상 적용
          minHeight: '200px' // 내용 없을 때 높이 유지 (선택사항)
        }} 
      >
        <div className="quadrant-header">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="quadrant-tasks">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <div 
                key={task.id} 
                className={`matrix-task ${task.completed ? 'completed' : ''}`}
                draggable 
                onDragStart={(e) => handleDragStart(e, task)}
                onClick={() => openEditModal(task)} 
              >
                <div className="matrix-task-content">{task.title}</div>
                {task.date && <div className="matrix-task-date">{formatDate(task.date)}</div>}
              </div>
            ))
          ) : (
            <div className="empty-quadrant">해당 작업 없음</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="matrix-container">
      <h1>우선순위 매트릭스</h1> {/* 제목 복구 */} 
      <div className="matrix-grid">
        {renderQuadrant('high')}
        {renderQuadrant('medium')}
        {renderQuadrant('low')}
        {renderQuadrant('none')}
      </div>

      {/* 모달 렌더링 */} 
      {isModalOpen && 
        <TaskModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          onSaveTask={handleSaveTask}
          taskToEdit={currentTask} 
        />
      }
    </div>
  );
};

export default MatrixView; 