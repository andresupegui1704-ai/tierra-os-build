// src/components/LoginPage.jsx
// Pagina di login Tierra OS.
// Tierra OS v9.5 — Security Hardening

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.error || 'Login fallito');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a3a2e 0%, #0d2218 100%)',
        padding: '20px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '40px 32px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '48px',
              marginBottom: '8px',
            }}
          >
            🌿
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              color: '#1a3a2e',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            Tierra OS
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
            Tierra Organic Bistrot
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              disabled={submitting}
              style={inputStyle}
              placeholder="tu@tierra.it"
            />
          </label>

          <label style={{ ...labelStyle, marginTop: '16px' }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
              style={inputStyle}
              placeholder="••••••••••••"
            />
          </label>

          {errorMsg && (
            <div
              role="alert"
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            style={{
              ...buttonStyle,
              opacity: submitting || !email || !password ? 0.6 : 1,
              cursor: submitting || !email || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          v9.5 · Sicuro
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '4px',
};

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: '6px',
  padding: '12px 14px',
  fontSize: '16px', // 16px su iOS evita zoom auto
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  background: '#f9fafb',
  outline: 'none',
  boxSizing: 'border-box',
};

const buttonStyle = {
  width: '100%',
  marginTop: '24px',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 600,
  color: '#ffffff',
  background: '#1a3a2e',
  border: 'none',
  borderRadius: '8px',
  transition: 'opacity 0.15s ease',
};
