import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { SettingsContext } from '../context/SettingsContext';

const SettingsView = () => {
  console.log('SettingsView 렌더링됨');
  
  const { theme, toggleTheme, setAppTheme } = useContext(ThemeContext);
  const { settings, updateSettings, resetSettings, exportData, importData } = useContext(SettingsContext);
  
  // 설정 상태 관리 (초기값 수정)
  const [formData, setFormData] = useState({
    // dataStoragePath: settings.dataStoragePath || '', // settings가 없을 수 있으므로 빈 값으로 초기화
    dataStoragePath: '', 
    // language: settings.language || 'ko', // settings가 없을 수 있으므로 기본값으로 초기화
    language: 'ko',
    theme: theme || 'light', // theme은 ThemeContext에서 바로 가져오므로 유지
    // autoBackup: settings.autoBackup || false,
    autoBackup: false,
    // autoBackupInterval: settings.autoBackupInterval || 60,
    autoBackupInterval: 60,
    // startMinimized: settings.startMinimized || false
    startMinimized: false
  });
  
  // 오류 상태
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // 컴포넌트 마운트 시 로그
  useEffect(() => {
    console.log('SettingsView 마운트됨, 설정:', settings);
    console.log('테마 컨텍스트:', theme);
    console.log('Electron API 확인:', window.electronAPI ? '사용 가능' : '사용 불가');
  }, []);
  
  // 설정 변경 시 폼 데이터 업데이트 (이 useEffect는 유지)
  useEffect(() => {
    console.log('설정이 변경되어 폼 데이터 업데이트:', settings);
    // settings가 유효한 객체일 때만 업데이트하도록 조건 추가
    if (settings) {
      setFormData({
        dataStoragePath: settings.dataStoragePath || '',
        language: settings.language || 'ko',
        theme: theme || 'light', // theme은 여기서도 ThemeContext 값 사용
        autoBackup: settings.autoBackup === undefined ? false : settings.autoBackup, // undefined 체크 추가
        autoBackupInterval: settings.autoBackupInterval || 60,
        startMinimized: settings.startMinimized === undefined ? false : settings.startMinimized // undefined 체크 추가
      });
    }
  }, [settings, theme]);
  
  // 입력 필드 변경 처리
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    console.log('입력 필드 변경:', name, newValue);
    
    // 테마 변경 시 즉시 적용
    if (name === 'theme') {
      console.log('테마 즉시 변경:', newValue);
      setAppTheme(newValue);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };
  
  // 데이터 저장 경로 설정
  const handleSetDataPath = async () => {
    console.log('데이터 저장 경로 설정 시도');
    
    try {
      // Electron이 있는 경우에만 폴더 선택 대화상자 열기
      if (window.electronAPI) {
        console.log('selectDirectory 호출');
        
        const selectedPath = await window.electronAPI.selectDirectory();
        console.log('선택된 경로:', selectedPath);
        
        if (selectedPath) {
          setFormData(prev => ({
            ...prev,
            dataStoragePath: selectedPath
          }));
        }
      } else {
        setError('폴더 선택 기능을 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('폴더 선택 오류:', error);
      setError(`폴더 선택 오류: ${error.message}`);
    }
  };
  
  // 설정 저장
  const handleSaveSettings = () => {
    console.log('설정 저장 시도:', formData);
    
    try {
      // 테마 설정 변경
      if (formData.theme !== theme) {
        console.log('테마 변경:', formData.theme);
        setAppTheme(formData.theme);
      }
      
      // 기타 설정 업데이트
      updateSettings({
        dataStoragePath: formData.dataStoragePath,
        language: formData.language,
        autoBackup: formData.autoBackup,
        autoBackupInterval: parseInt(formData.autoBackupInterval, 10),
        startMinimized: formData.startMinimized
      });
      
      setSuccess('설정이 저장되었습니다.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('설정 저장 오류:', error);
      setError(`설정 저장 오류: ${error.message}`);
    }
  };
  
  // 설정 초기화
  const handleResetSettings = () => {
    console.log('설정 초기화 확인');
    
    if (window.confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
      resetSettings();
      setSuccess('설정이 초기화되었습니다.');
      setTimeout(() => setSuccess(null), 3000);
    }
  };
  
  // 데이터 내보내기
  const handleExportData = async () => {
    console.log('데이터 내보내기 시도');
    
    try {
      if (window.electronAPI) {
        console.log('showSaveDialog 호출');
        
        const filePath = await window.electronAPI.showSaveDialog({
          title: '데이터 내보내기',
          defaultPath: 'TodoTools-Backup.csv',
          filters: [
            { name: 'CSV 파일', extensions: ['csv'] }
          ]
        });
        
        console.log('선택된 파일 경로:', filePath);
        
        if (filePath) {
          await exportData(filePath);
          setSuccess('데이터를 성공적으로 내보냈습니다.');
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        setError('내보내기 기능을 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      setError(`데이터 내보내기 오류: ${error.message}`);
    }
  };
  
  // 데이터 가져오기
  const handleImportData = async () => {
    console.log('데이터 가져오기 시도');
    
    try {
      if (window.electronAPI) {
        console.log('showOpenDialog 호출');
        
        const filePaths = await window.electronAPI.showOpenDialog({
          title: '데이터 가져오기',
          properties: ['openFile'],
          filters: [
            { name: 'CSV 파일', extensions: ['csv'] }
          ]
        });
        
        console.log('선택된 파일:', filePaths);
        
        if (filePaths && filePaths.length > 0) {
          await importData(filePaths[0]);
          setSuccess('데이터를 성공적으로 가져왔습니다.');
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        setError('가져오기 기능을 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      setError(`데이터 가져오기 오류: ${error.message}`);
    }
  };
  
  // 테마 옵션 선택 처리
  const handleThemeSelect = (selectedTheme) => {
    console.log('테마 선택:', selectedTheme);
    
    // 테마 즉시 적용
    setAppTheme(selectedTheme);
    
    // 폼 데이터 업데이트
    setFormData(prev => ({
      ...prev,
      theme: selectedTheme
    }));
    
    // 변경 알림
    setSuccess('테마가 변경되었습니다.');
    setTimeout(() => setSuccess(null), 2000);
  };
  
  return (
    <div className="settings-container">
      <h1>설정</h1>
      
      {/* 알림 메시지 */}
      {error && (
        <div className="alert alert-error">
          <i className="material-icons">error</i>
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <i className="material-icons">close</i>
          </button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <i className="material-icons">check_circle</i>
          <span>{success}</span>
        </div>
      )}
      
      {/* 테마 설정 - 더 눈에 띄게 상단에 배치 */}
      <div className="settings-section theme-section">
        <h2>테마 설정</h2>
        
        <div className="theme-options">
          <div 
            className={`theme-option ${formData.theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeSelect('light')}
          >
            <div className="theme-preview light-theme">
              <i className="material-icons">light_mode</i>
            </div>
            <span>라이트 모드</span>
          </div>
          
          <div 
            className={`theme-option ${formData.theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeSelect('dark')}
          >
            <div className="theme-preview dark-theme">
              <i className="material-icons">dark_mode</i>
            </div>
            <span>다크 모드</span>
          </div>
        </div>
      </div>
      
      {/* 일반 설정 섹션 - 제거 시작 */}
      {/* 
      <div className="settings-section">
        <h2>일반 설정</h2>
        
        <div className="form-group">
          <label>언어</label>
          <select 
            name="language" 
            value={formData.language} 
            onChange={handleInputChange}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <div className="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              name="startMinimized" 
              checked={formData.startMinimized} 
              onChange={handleInputChange} 
            />
            시작 시 최소화
          </label>
        </div>
      </div> 
      */}
      {/* 일반 설정 섹션 - 제거 끝 */}
      
      <div className="settings-section">
        <h2>데이터 설정</h2>
        
        {/* 데이터 저장 경로 */}
        <div className="form-group">
          <label>데이터 저장 경로</label>
          <div className="input-with-button">
            <input 
              type="text" 
              name="dataStoragePath" 
              value={formData.dataStoragePath} 
              onChange={handleInputChange} 
              readOnly 
            />
            <button onClick={handleSetDataPath}>
              <i className="material-icons">folder</i>
              찾아보기
            </button>
          </div>
          <small>변경 시 앱을 재시작해야 적용됩니다.</small>
        </div>
        
        {/* 자동 백업 설정 */}
        <div className="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              name="autoBackup" 
              checked={formData.autoBackup} 
              onChange={handleInputChange} 
            />
            자동 백업 활성화
          </label>
        </div>
        
        {formData.autoBackup && (
          <div className="form-group">
            <label>백업 간격 (분)</label>
            <input 
              type="number" 
              name="autoBackupInterval" 
              value={formData.autoBackupInterval} 
              onChange={handleInputChange} 
              min="1" 
              max="1440" 
            />
          </div>
        )}
        
        {/* 데이터 관리 버튼 */}
        <div className="button-group">
          <button onClick={handleExportData}>
            <i className="material-icons">cloud_download</i>
            데이터 내보내기
          </button>
          <button onClick={handleImportData}>
            <i className="material-icons">cloud_upload</i>
            데이터 가져오기
          </button>
        </div>
      </div>
      
      <div className="settings-footer">
        <button className="secondary" onClick={handleResetSettings}>
          <i className="material-icons">refresh</i>
          설정 초기화
        </button>
        <button onClick={handleSaveSettings}>
          <i className="material-icons">save</i>
          설정 저장
        </button>
      </div>
    </div>
  );
};

export default SettingsView; 