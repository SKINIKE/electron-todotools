import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import MatrixView from './components/MatrixView';
import CalendarView from './components/CalendarView';
import PomodoroTimer from './components/PomodoroTimer';
import Calculator from './components/Calculator';
import StickyNotes from './components/StickyNotes';
import SettingsProvider from './context/SettingsContext';
import ThemeProvider from './context/ThemeContext';
import SettingsView from './components/SettingsView';

// 메뉴 타입 정의
const MenuType = {
  TASKS: 'tasks',
  MATRIX: 'matrix',
  CALENDAR: 'calendar',
  POMODORO: 'pomodoro',
  CALCULATOR: 'calculator',
  STICKY_NOTES: 'stickyNotes',
  SETTINGS: 'settings'
};

function App() {
  // 현재 선택된 메뉴 상태
  const [selectedMenu, setSelectedMenu] = useState(MenuType.TASKS);
  // 할 일 필터링 상태
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // 메뉴 변경 핸들러
  const handleMenuChange = (menuType) => {
    setSelectedMenu(menuType);
  };

  // body에 테마 클래스가 있는지 확인하고 없으면 추가
  useEffect(() => {
    const body = document.body;
    if (!body.hasAttribute('data-theme')) {
      body.setAttribute('data-theme', 'light');
    }
  }, []);

  // 선택된 메뉴에 따라 다른 컴포넌트 렌더링
  const renderContent = () => {
    // 설정 메뉴인 경우
    if (selectedMenu === MenuType.SETTINGS) {
      return <SettingsView />;
    }
    
    switch (selectedMenu) {
      case MenuType.TASKS:
        return (
          <TaskList 
            showTodayOnly={showTodayOnly} 
            showPinnedOnly={showPinnedOnly} 
          />
        );
      case MenuType.MATRIX:
        return <MatrixView />;
      case MenuType.CALENDAR:
        return <CalendarView />;
      case MenuType.POMODORO:
        return <PomodoroTimer />;
      case MenuType.CALCULATOR:
        return <Calculator />;
      case MenuType.STICKY_NOTES:
        return <StickyNotes />;
      default:
        return <TaskList />;
    }
  };

  return (
    <ThemeProvider>
      <SettingsProvider>
        <div className="app-container">
          <Sidebar 
            selectedMenu={selectedMenu} 
            setSelectedMenu={handleMenuChange}
            showTodayOnly={showTodayOnly}
            setShowTodayOnly={setShowTodayOnly}
            showPinnedOnly={showPinnedOnly}
            setShowPinnedOnly={setShowPinnedOnly}
          />
          <div className="main-content">
            {renderContent()}
          </div>
        </div>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App; 