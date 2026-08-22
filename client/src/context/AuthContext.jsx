import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/resources';

const AuthContext = createContext(null);

const TOKEN_KEY = 'bb_token';
const USER_KEY = 'bb_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const persist = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(TOKEN_KEY, nextToken);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  // If any API call comes back 401 (expired/invalid token), api/client.js
  // dispatches this event so the whole app logs out consistently in one place.
  useEffect(() => {
    window.addEventListener('bb:unauthorized', logout);
    return () => window.removeEventListener('bb:unauthorized', logout);
  }, [logout]);

  async function login(email, password) {
    const res = await authApi.login({ email, password });
    const payload = res?.data || res;
    persist(payload.user, payload.token);
    return payload.user;
  }

  async function register(payload) {
    const res = await authApi.register(payload);
    const body = res?.data || res;
    persist(body.user, body.token);
    return body.user;
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}