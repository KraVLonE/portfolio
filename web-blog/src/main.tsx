import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { primeFromDocument } from './cache';

primeFromDocument(); // server-embedded data for this page -> first render has content

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
