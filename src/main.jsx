// src/main.jsx
// Entry point app con AuthProvider + ProtectedRoute
// Tierra OS v9.5 — Security Hardening

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ProtectedRoute requiredRole="staff">
        <App />
      </ProtectedRoute>
    </AuthProvider>
  </React.StrictMode>
);
