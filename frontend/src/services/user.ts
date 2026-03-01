/**
 * 用户相关 API
 */
import { api } from '@/utils/request';

export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// 用户登录
export const login = (data: LoginParams): Promise<TokenResponse> => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('password', data.password);
  return api.post<TokenResponse>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

// 用户注册
export const register = (data: RegisterParams): Promise<User> => {
  return api.post<User>('/auth/register', data);
};

// 获取当前用户信息
export const getCurrentUser = (): Promise<User> => {
  return api.get<User>('/auth/me');
};
