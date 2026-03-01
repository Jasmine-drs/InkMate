/**
 * 角色管理 API 客户端
 */
import { api } from '@/utils/request';

export interface CharacterData {
  id?: string;
  project_id?: string;
  name: string;
  role_type?: string;
  card_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCharacterParams {
  name: string;
  role_type?: string;
  card_data?: Record<string, unknown>;
}

export interface UpdateCharacterParams {
  name?: string;
  role_type?: string;
  card_data?: Record<string, unknown>;
}

/**
 * 创建角色
 */
export const createCharacter = async (
  projectId: string,
  data: CreateCharacterParams
): Promise<CharacterData> => {
  return api.post(`/projects/${projectId}/characters`, data);
};

/**
 * 获取角色列表
 */
export const getCharacterList = async (
  projectId: string,
  page = 1,
  pageSize = 20
): Promise<{ items: CharacterData[]; total: number; page: number; page_size: number }> => {
  return api.get(`/projects/${projectId}/characters`, {
    params: { page, page_size: pageSize },
  });
};

/**
 * 获取角色详情
 */
export const getCharacter = async (
  projectId: string,
  characterId: string
): Promise<CharacterData> => {
  return api.get(`/projects/${projectId}/characters/${characterId}`);
};

/**
 * 更新角色
 */
export const updateCharacter = async (
  projectId: string,
  characterId: string,
  data: UpdateCharacterParams
): Promise<CharacterData> => {
  return api.put(`/projects/${projectId}/characters/${characterId}`, data);
};

/**
 * 删除角色
 */
export const deleteCharacter = async (
  projectId: string,
  characterId: string
): Promise<void> => {
  return api.delete(`/projects/${projectId}/characters/${characterId}`);
};
