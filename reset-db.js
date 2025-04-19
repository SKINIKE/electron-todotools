const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 이 스크립트는 독립적으로 실행됩니다
if (require.main === module) {
  // Electron 앱이 초기화되기를 기다립니다
  const appReady = app.whenReady();
  appReady.then(() => {
    resetDatabase();
  });
}

function resetDatabase() {
  const userDataPath = app.getPath('userData');
  const dbDirectory = path.join(userDataPath, 'database');
  const dbPath = path.join(dbDirectory, 'todotools.db');
  
  console.log('데이터베이스 경로:', dbPath);
  
  try {
    // 데이터베이스 파일이 존재하면 삭제
    if (fs.existsSync(dbPath)) {
      // 백업 생성
      const backupPath = `${dbPath}.backup_${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      console.log(`기존 데이터베이스 백업 완료: ${backupPath}`);
      
      // 파일 삭제
      fs.unlinkSync(dbPath);
      console.log('기존 데이터베이스 파일이 삭제되었습니다.');
    } else {
      console.log('데이터베이스 파일이 존재하지 않습니다. 새로 생성됩니다.');
    }
    
    console.log('데이터베이스가 초기화되었습니다. 앱을 다시 시작하세요.');
    process.exit(0);
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
    process.exit(1);
  }
}

module.exports = { resetDatabase }; 