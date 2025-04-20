import React, { useState, useEffect, useRef } from 'react';

// 이제 Add/Edit 겸용 모달
const TaskModal = ({ isOpen, onClose, onSaveTask, taskToEdit }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState('none');
  const [pinned, setPinned] = useState(false);
  const [completed, setCompleted] = useState(false); // 수정 시 완료 상태 표시용
  const dateInputRef = useRef(null); // 날짜 입력 요소에 대한 ref 생성

  // 모달이 열리거나 수정할 작업이 변경될 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        // 수정 모드: 기존 작업 데이터로 상태 설정
        setTitle(taskToEdit.title || '');
        setDate(taskToEdit.date instanceof Date ? taskToEdit.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setPriority(taskToEdit.priority || 'none');
        setPinned(taskToEdit.pinned || false);
        setCompleted(taskToEdit.completed || false);
      } else {
        // 추가 모드: 상태 초기화
        setTitle('');
        setDate(new Date().toISOString().split('T')[0]); // 기본값 오늘
        setPriority('none');
        setPinned(false);
        setCompleted(false);
      }
    }
  }, [isOpen, taskToEdit]);

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('할 일 제목을 입력해주세요.');
      return;
    }
    // taskToEdit가 있으면 기존 ID 포함, 없으면 null
    const taskData = {
      id: taskToEdit ? taskToEdit.id : null, 
      title: title,
      date: date, 
      priority: priority,
      pinned: pinned,
      completed: completed // 완료 상태도 전달 (수정 시)
    };
    onSaveTask(taskData);
  };

  // 날짜 입력 필드 클릭 시 달력 표시
  const handleDateInputClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (error) {
        console.error("Date picker could not be shown:", error);
        // 일부 브라우저에서는 지원하지 않을 수 있음
      }
    }
  };

  if (!isOpen) return null;

  const isEditing = !!taskToEdit; // 수정 모드 여부

  return (
    <div className="modal"> {/* styles.css의 기본 모달 스타일 사용 */}
      <div className="modal-content">
        <h2>{isEditing ? '할 일 수정' : '새 할 일 추가'}</h2>
        
        <div className="form-group">
          <label htmlFor="task-title">제목</label>
          <input
            id="task-title"
            type="text"
            placeholder="할 일 내용"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="task-date">날짜</label>
          <input
            id="task-date"
            type="date"
            ref={dateInputRef} // ref 연결
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onClick={handleDateInputClick} // 클릭 핸들러 추가
            // 기본 달력 아이콘이 거슬린다면 스타일로 숨길 수도 있음
            // style={{ appearance: 'none' }} 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="task-priority">중요도</label>
          <select 
            id="task-priority"
            value={priority} 
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="high">높음</option>
            <option value="medium">중간</option>
            <option value="low">낮음</option>
            <option value="none">선택안함</option>
          </select>
        </div>
        
        <div className="form-group checkbox-group">
          <label htmlFor="task-pinned">
            <input
              id="task-pinned"
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            고정하기
          </label>
        </div>

        {/* 수정 모드일 때만 완료 상태 체크박스 표시 */}
        {isEditing && (
          <div className="form-group checkbox-group">
            <label htmlFor="task-completed">
              <input
                id="task-completed"
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              완료됨
            </label>
          </div>
        )}
        
        <div className="modal-actions">
          <button onClick={handleSubmit}>{isEditing ? '저장' : '추가'}</button>
          <button className="secondary" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal; 