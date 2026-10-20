import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/fonts';
import './print.css';
import { PrintApp } from './PrintApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrintApp />
  </React.StrictMode>
);
