import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/fonts';
import './online.css';
import { OnlineMenuApp } from './OnlineMenuApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OnlineMenuApp />
  </React.StrictMode>
);
