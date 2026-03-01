/**
 * 大纲管理 API 客户端
 */
import { api } from '@/utils/request';

export interface OutlineData {
  id: string;
  project_id: string;
  unit_id?: string | null;
  outline_type: string; // main, unit, chapter
  parent_id?: string | null;
  chapter_number?: number | null;
  content?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOutlineParams {
  outline_type: string;
  parent_id?: string | null;
  chapter_number?: number | null;
  content?: string;
  sort_order?: number;
  unit_id?: string | null;
}

export interface UpdateOutlineParams {
  content?: string;
  sort_order?: number;
}

/**
 * 创建大纲
 */
export const createOutline = async (
  projectId: string,
  data: CreateOutlineParams,
  unitId?: string | null
): Promise<OutlineData> => {
  return api.post(`/projects/${projectId}/outlines`, data, {
    params: unitId ? { unit_id: unitId } : undefined,
  });
};

/**
 * 获取大纲列表
 */
export const getOutlineList = async (
  projectId: string,
  outlineType?: string,
  unitId?: string | null,
  page = 1,
  pageSize = 20
): Promise<{ items: OutlineData[]; total: number; page: number; page_size: number }> => {
  return api.get(`/projects/${projectId}/outlines`, {
    params: {
      page,
      page_size: pageSize,
      outline_type: outlineType,
      unit_id: unitId
    },
  });
};

/**
 * 获取大纲详情
 */
export const getOutline = async (
  projectId: string,
  outlineId: string
): Promise<OutlineData> => {
  return api.get(`/projects/${projectId}/outlines/${outlineId}`);
};

/**
 * 更新大纲
 */
export const updateOutline = async (
  projectId: string,
  outlineId: string,
  data: UpdateOutlineParams
): Promise<OutlineData> => {
  return api.put(`/projects/${projectId}/outlines/${outlineId}`, data);
};

/**
 * 删除大纲
 */
export const deleteOutline = async (
  projectId: string,
  outlineId: string
): Promise<void> => {
  return api.delete(`/projects/${projectId}/outlines/${outlineId}`);
};
