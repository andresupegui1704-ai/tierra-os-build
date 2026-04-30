// src/components/UserMenu.jsx
// Pulsante utente con menu (logout, info ruolo).
// Tierra OS v9.5 — Security Hardening

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABEL = {
  owner: 'Titolare',
  manager: 'Manager',
  staff: 'Staff',
};

const ROLE_COLOR = {
  owner: '#7c3aed',
  manager: '#2563eb',
  staff: '#059669',
};

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleColor = ROLE_COLOR[user.role] || '#6b7280';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '20px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '13px',
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: roleColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {initials}
        </span>
        <span style={{ fontWeight: 600 }}>{user.name}</span>
        <span style={{ opacity: 0.7, fontSize: '11px' }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: '#fff',
            color: '#111',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            minWidth: '220px',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {user.email}
            </div>
            <span
              style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff',
                background: roleColor,
                borderRadius: '10px',
              }}
            >
              {ROLE_LABEL[user.role] || user.role}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#dc2626',
              fontFamily: 'inherit',
            }}
          >
            Esci
          </button>
        </div>
      )}
    </div>
  );
}
