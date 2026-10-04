import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, clearAuthToken } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = '@secflow_auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.token) {
            setAuthToken(saved.token);
            setUser(saved);
          }
        }
      } catch (e) {
        console.log('Auth restore failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (response) => {
    // response: { token, role, name, gender, department }
    const session = { ...response };
    setAuthToken(session.token);
    setUser(session);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.log('Auth persist failed:', e);
    }
  };

  const logout = async () => {
    clearAuthToken();
    setUser(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.log('Auth clear failed:', e);
    }
  };

  const updateUser = async (patch) => {
    const next = { ...user, ...patch };
    setUser(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('Auth persist failed:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
