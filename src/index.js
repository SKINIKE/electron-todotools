import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// React 18 방식으로 마운트
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 