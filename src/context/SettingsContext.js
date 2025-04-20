import React, { createContext, useState, useEffect } from 'react';

// 설정 컨텍스트 생성
export const SettingsContext = createContext();

// 기본 설정 값
const DEFAULT_SETTINGS = {
  theme: 'light',
  dataStoragePath: '', // 기본 저장 경로는 getDefaultStoragePath()에서 결정
  language: 'ko', // 한국어 기본
  autoBackup: true,
  autoBackupInterval: 60, // 분 단위
  startMinimized: false
};

// 설정 제공자 컴포넌트
const SettingsProvider = ({ children }) => {
  // 웹 환경에서 electron 모듈 사용 가능 여부 확인
  const isElectron = window.electronAPI !== undefined;
  
  // 개발 모드 확인
  const isDev = process.env.NODE_ENV === 'development';
  
  // 기본 데이터 저장 경로 가져오기
  const getDefaultStoragePath = () => {
    try {
      if (isElectron && window.electronAPI) {
        console.log('Electron API 사용 가능, 앱 경로 가져오기 시도');
        // getAppPath가 비동기적으로 작동하므로 이에 대한 처리가 필요함
        // 초기 기본값 사용, 비동기 로드 후 업데이트
        setTimeout(() => {
          window.electronAPI.getAppPath()
            .then(appPath => {
              console.log('앱 경로를 받았습니다:', appPath);
              updateSettings({ dataStoragePath: appPath });
            })
            .catch(error => {
              console.error('앱 경로 가져오기 오류:', error);
            });
        }, 500);
        
        return '';
      }
      
      // 개발 환경 또는 Electron API가 없는 경우 기본값
      return isDev ? './dev-data' : '';
    } catch (error) {
      console.error('기본 데이터 저장 경로 설정 오류:', error);
      return '';
    }
  };

  // 설정 초기화
  const [settings, setSettings] = useState(() => {
    // 로컬 스토리지에서 설정 로드
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        console.log('저장된 설정을 불러왔습니다:', parsedSettings);
        
        // 데이터 저장 경로가 비어있으면 기본 경로로 설정
        if (!parsedSettings.dataStoragePath) {
          parsedSettings.dataStoragePath = getDefaultStoragePath();
        }
        
        return parsedSettings;
      } catch (e) {
        console.error('설정 파싱 오류:', e);
      }
    }
    
    // 기본 설정에 저장 경로 추가
    const defaultSettings = {
      ...DEFAULT_SETTINGS,
      dataStoragePath: getDefaultStoragePath()
    };
    
    console.log('기본 설정을 사용합니다:', defaultSettings);
    return defaultSettings;
  });

  // 설정 변경 함수
  const updateSettings = (newSettings) => {
    console.log('설정 업데이트:', newSettings);
    
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // 로컬 스토리지에 저장
      localStorage.setItem('appSettings', JSON.stringify(updated));
      
      // 저장 경로 변경 시 필요한 추가 작업 수행
      if (newSettings.dataStoragePath && newSettings.dataStoragePath !== prev.dataStoragePath) {
        // Electron이 있는 경우에만 디렉토리 체크 수행
        if (isElectron && window.electronAPI) {
          console.log('디렉토리 존재 확인 시도:', newSettings.dataStoragePath);
          
          window.electronAPI.ensureDirectoryExists(newSettings.dataStoragePath)
            .then(result => {
              console.log('디렉토리 확인 결과:', result);
            })
            .catch(error => {
              console.error('저장 경로 디렉토리 생성 오류:', error);
            });
        }
      }
      
      return updated;
    });
  };

  // 데이터 내보내기 함수
  const exportData = async (exportPath) => {
    console.log('데이터 내보내기 시도:', exportPath);
    
    try {
      if (isElectron && window.electronAPI) {
        return await window.electronAPI.exportData(exportPath);
      } else {
        throw new Error('내보내기 기능을 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      throw error;
    }
  };

  // 데이터 가져오기 함수
  const importData = async (importPath) => {
    console.log('데이터 가져오기 시도:', importPath);
    
    try {
      if (isElectron && window.electronAPI) {
        return await window.electronAPI.importData(importPath);
      } else {
        throw new Error('가져오기 기능을 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      throw error;
    }
  };

  // 설정 초기화 함수
  const resetSettings = () => {
    console.log('설정 초기화');
    
    const defaultPath = getDefaultStoragePath();
    const resetSettings = {
      ...DEFAULT_SETTINGS,
      dataStoragePath: defaultPath
    };
    
    setSettings(resetSettings);
    localStorage.setItem('appSettings', JSON.stringify(resetSettings));
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        settings, 
        updateSettings,
        resetSettings,
        exportData, 
        importData
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider; 