import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/fonts';
import './admin.css';
import { AdminApp } from './AdminApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
