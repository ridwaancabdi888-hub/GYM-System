import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('gym_saas_token'));
  const [profile, setProfile] = useState(() => {
    const raw = localStorage.getItem('gym_saas_profile');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (identifier, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      localStorage.setItem('gym_saas_token', data.token);
      localStorage.setItem('gym_saas_profile', JSON.stringify(data.profile));
      setToken(data.token);
      setProfile(data.profile);
      return data.profile;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('gym_saas_token');
    localStorage.removeItem('gym_saas_profile');
    setToken(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    if (token && !profile) {
      api
        .get('/auth/me')
        .then(({ data }) => setProfile({ ...data.profile, role: data.role }))
        .catch(() => logout());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = {
    token,
    profile,
    role: profile?.role || null,
    permissions: profile?.permissions || {},
    isAuthenticated: !!token,
    loading,
    login,
    logout,
    setProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
