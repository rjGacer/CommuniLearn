import React from 'react';
import './setupProxy';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import ModalProvider from './context/ModalProvider';
import { jsx as _jsx } from "react/jsx-runtime";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/_jsx(React.StrictMode, {
  children: /*#__PURE__*/_jsx(ModalProvider, {
    children: /*#__PURE__*/_jsx(AuthProvider, {
      children: /*#__PURE__*/_jsx(App, {})
    })
  })
}));