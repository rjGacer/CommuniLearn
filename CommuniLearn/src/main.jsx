import React from 'react';
import './setupProxy';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import ModalProvider from './context/ModalProvider';
import { jsx as _jsx } from "react/jsx-runtime";
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/_jsx(React.StrictMode, {
  children: /*#__PURE__*/_jsx(ModalProvider, {
    children: /*#__PURE__*/_jsx(AuthProvider, {
      children: /*#__PURE__*/_jsx(App, {})
    })
  })
}));