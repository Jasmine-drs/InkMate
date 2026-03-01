/**
 * 项目相关 API
 */
import { api } from '@/utils/request';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  genre?: string;
  type: string;
  description?: string;
  settings?: Record<string, unknown>;
  cover_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  title: string;
  genre?: string;
  type?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface ProjectUpdate {
  title?: string;
  genre?: string;
  type?: string;
  description?: string;
  settings?: Record<string, unknown>;
  cover_url?: string;
  is_public?: boolean;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

// 创建项目
export const createProject = (data: ProjectCreate): Promise<Project> => {
  return api.post<Project>('/projects', data);
};

// 获取项目列表
export const getProjectList = (page = 1, page_size = 20): Promise<ProjectListResponse> => {
  return api.get<ProjectListResponse>(`/projects?page=${page}&page_size=${page_size}`);
};

// 获取项目详情
export const getProject = (id: string): Promise<Project> => {
  return api.get<Project>(`/projects/${id}`);
};

// 更新项目
export const updateProject = (id: string, data: ProjectUpdate): Promise<Project> => {
  return api.put<Project>(`/projects/${id}`, data);
};

// 删除项目
export const deleteProject = (id: string): Promise<{ message: string }> => {
  return api.delete<{ message: string }>(`/projects/${id}`);
};
