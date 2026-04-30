// src/components/ProtectedRoute.jsx
// Wrapper che mostra LoginPage se non autenticato, contenuto se autenticato.
// Se requiredRole è specificato, blocca utenti con role insufficiente.
// Tierra OS v9.5 — Security Hardening

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from './LoginPage';

export default function ProtectedRoute({ children, requiredRole = 'staff' }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a3a2e',
          color: '#fff',
          fontFamily: '-apple-system, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>Caricamento…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!hasRole(requiredRole)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: '#f9fafb',
          fontFamily: '-apple-system, sans-serif',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ margin: '0 0 8px', color: '#111827', fontSize: '18px' }}>
            Accesso non autorizzato
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Questa sezione richiede il ruolo <strong>{requiredRole}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
