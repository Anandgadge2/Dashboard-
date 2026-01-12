'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, LoginCredentials } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface User {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId?: string;
  departmentId?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const currentUser = authAPI.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success) {
        const { user, accessToken, refreshToken } = response.data;
        
        // Save tokens
        apiClient.setToken(accessToken);
        apiClient.setRefreshToken(refreshToken);
        
        // Save user with all properties
        const userWithActive = {
          ...user,
          isActive: user.isActive ?? true // Default to true if not provided
        };
        authAPI.saveUser(userWithActive);
        setUser(userWithActive);
        
        toast.success('Login successful!');
        
        // Redirect based on role
        if (user.role === 'SUPER_ADMIN') {
          router.push('/superadmin/dashboard');
        } else if (user.role === 'COMPANY_ADMIN') {
          router.push('/dashboard');
        } else if (user.role === 'DEPARTMENT_ADMIN') {
          router.push('/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
