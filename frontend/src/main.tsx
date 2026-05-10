import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './utils/env'; // valida variables de entorno al startup — lanza si faltan

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
