/**
 * 用户状态管理
 */
import { create } from 'zustand';
import type { User } from '@/services/user';

interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  initAuth: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  get isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },

  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },

  initAuth: () => {
    // 从 localStorage 重新读取 token 状态
    const token = localStorage.getItem('access_token');
    if (token) {
      set({ token });
    }
  },
}));
