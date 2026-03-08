import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authService } from '../services/auth';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signInAs: (role: Role) => Promise<void>;
  register: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    const loadSession = async () => {
      try {
        const sessionUser = await authService.checkSession();
        if (sessionUser) setUser(sessionUser);
      } catch (error) {
        console.error('Failed to load session', error);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const signInAs = async (role: Role) => {
    try {
      const loggedInUser = await authService.mockLoginAs(role);
      setUser(loggedInUser);
    } catch (error) {
      console.error('Sign in failed', error);
      throw error;
    }
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const newUser = await authService.mockRegister(userData);
      setUser(newUser);
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInAs, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
