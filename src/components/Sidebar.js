import React, { useState } from 'react';

// 메뉴 타입 정의 (App.js와 동기화)
const MenuType = {
  TASKS: 'tasks',
  MATRIX: 'matrix',
  CALENDAR: 'calendar',
  POMODORO: 'pomodoro',
  CALCULATOR: 'calculator',
  STICKY_NOTES: 'stickyNotes',
  SETTINGS: 'settings'
};

const Sidebar = ({ 
  selectedMenu, 
  setSelectedMenu,
  showTodayOnly,
  setShowTodayOnly,
  showPinnedOnly,
  setShowPinnedOnly 
}) => {
  // 메뉴 확장 상태
  const [todoMenuExpanded, setTodoMenuExpanded] = useState(true);
  const [productivityMenuExpanded, setProductivityMenuExpanded] = useState(false);

  return (
    <div className="sidebar">
      {/* 앱 제목 */}
      <div className="app-title">TodoTools</div>
      
      {/* 메뉴 목록 */}
      <nav className="nav-menu">
        {/* TO-DO 상위 메뉴 (접을 수 있음) */}
        <div 
          className="nav-item"
          onClick={() => setTodoMenuExpanded(!todoMenuExpanded)}
        >
          <i className="material-icons">checklist</i>
          <span>TO-DO</span>
          <i className="material-icons" style={{ marginLeft: 'auto' }}>
            {todoMenuExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          </i>
        </div>
        
        {/* 하위 메뉴 항목들 */}
        {todoMenuExpanded && (
          <div className="submenu">
            {/* 모든 할 일 메뉴 */}
            <div 
              className={`nav-item ${!showTodayOnly && !showPinnedOnly && selectedMenu === MenuType.TASKS ? 'active' : ''}`}
              onClick={() => {
                setShowTodayOnly(false);
                setShowPinnedOnly(false);
                setSelectedMenu(MenuType.TASKS);
              }}
            >
              <i className="material-icons">task_alt</i>
              <span>모든 할 일</span>
            </div>
            
            {/* 오늘 할 일 메뉴 */}
            <div 
              className={`nav-item ${showTodayOnly && selectedMenu === MenuType.TASKS ? 'active' : ''}`}
              onClick={() => {
                setShowTodayOnly(true);
                setShowPinnedOnly(false);
                setSelectedMenu(MenuType.TASKS);
              }}
            >
              <i className="material-icons">calendar_today</i>
              <span>오늘</span>
            </div>
            
            {/* 고정된 할 일 메뉴 */}
            <div 
              className={`nav-item ${showPinnedOnly && selectedMenu === MenuType.TASKS ? 'active' : ''}`}
              onClick={() => {
                setShowTodayOnly(false);
                setShowPinnedOnly(true);
                setSelectedMenu(MenuType.TASKS);
              }}
            >
              <i className="material-icons">push_pin</i>
              <span>고정됨</span>
            </div>
          </div>
        )}
        
        {/* 매트릭스 메뉴 */}
        <div 
          className={`nav-item ${selectedMenu === MenuType.MATRIX ? 'active' : ''}`}
          onClick={() => {
            setSelectedMenu(MenuType.MATRIX);
            setShowTodayOnly(false);
            setShowPinnedOnly(false);
          }}
        >
          <i className="material-icons">grid_4x4</i>
          <span>매트릭스</span>
        </div>
        
        {/* 캘린더 메뉴 */}
        <div 
          className={`nav-item ${selectedMenu === MenuType.CALENDAR ? 'active' : ''}`}
          onClick={() => {
            setSelectedMenu(MenuType.CALENDAR);
            setShowTodayOnly(false);
            setShowPinnedOnly(false);
          }}
        >
          <i className="material-icons">calendar_month</i>
          <span>캘린더</span>
        </div>
        
        {/* 생산성 도구 메뉴 */}
        <div 
          className="nav-item"
          onClick={() => setProductivityMenuExpanded(!productivityMenuExpanded)}
        >
          <i className="material-icons">build_circle</i>
          <span>생산성 도구</span>
          <i className="material-icons" style={{ marginLeft: 'auto' }}>
            {productivityMenuExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          </i>
        </div>
        
        {productivityMenuExpanded && (
          <div className="submenu">
            <div 
              className={`nav-item ${selectedMenu === MenuType.POMODORO ? 'active' : ''}`}
              onClick={() => setSelectedMenu(MenuType.POMODORO)}
            >
              <i className="material-icons">timer</i>
              <span>뽀모도로 타이머</span>
            </div>
            
            <div 
              className={`nav-item ${selectedMenu === MenuType.CALCULATOR ? 'active' : ''}`}
              onClick={() => setSelectedMenu(MenuType.CALCULATOR)}
            >
              <i className="material-icons">calculate</i>
              <span>계산기</span>
            </div>
            
            <div 
              className={`nav-item ${selectedMenu === MenuType.STICKY_NOTES ? 'active' : ''}`}
              onClick={() => setSelectedMenu(MenuType.STICKY_NOTES)}
            >
              <i className="material-icons">sticky_note_2</i>
              <span>스티키 노트</span>
            </div>
          </div>
        )}
      </nav>
      
      {/* 사이드바 푸터 */}
      <div className="sidebar-footer">
        {/* 설정 메뉴 */}
        <div 
          className={`nav-item ${selectedMenu === MenuType.SETTINGS ? 'active' : ''}`}
          onClick={() => {
            setSelectedMenu(MenuType.SETTINGS);
          }}
        >
          <i className="material-icons">settings</i>
          <span>설정</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 