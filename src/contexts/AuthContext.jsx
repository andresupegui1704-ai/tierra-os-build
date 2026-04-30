// src/contexts/AuthContext.jsx
// Context React per stato auth globale.
// Tierra OS v9.5 — Security Hardening

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, ApiError } from '../lib/api';

const AuthContext = createContext(null);

const ROLE_LEVEL = { staff: 1, manager: 2, owner: 3 };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Al mount, verifica se c'è una sessione attiva (cookie già presente)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authApi.me();
        if (!cancelled && data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        // 401 atteso se non loggato — non logghiamo errore
        if (err instanceof ApiError && err.status !== 401) {
          console.error('[auth] me() error:', err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await authApi.login(email, password);
      if (data?.user) {
        setUser(data.user);
        return { ok: true };
      }
      throw new ApiError('Risposta server non valida', 500, null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Errore login';
      setError(msg);
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('[auth] logout error:', err.message);
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (minRole) => {
      if (!user?.role) return false;
      return (ROLE_LEVEL[user.role] || 0) >= (ROLE_LEVEL[minRole] || 0);
    },
    [user]
  );

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    hasRole,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
