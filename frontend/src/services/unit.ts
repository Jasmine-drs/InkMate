/**
 * 单元管理 API 客户端
 */
import { api } from '@/utils/request';

export interface UnitData {
  id: string;
  project_id: string;
  unit_number: number;
  title: string;
  unit_type?: string;
  start_chapter?: number;
  end_chapter?: number;
  settings?: Record<string, unknown>;
  outline?: Record<string, unknown>;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUnitParams {
  unit_number: number;
  title?: string;
  unit_type?: string;
  start_chapter?: number;
  end_chapter?: number;
  settings?: Record<string, unknown>;
  outline?: Record<string, unknown>;
}

export interface UpdateUnitParams {
  title?: string;
  unit_type?: string;
  start_chapter?: number;
  end_chapter?: number;
  settings?: Record<string, unknown>;
  outline?: Record<string, unknown>;
  status?: string;
}

/**
 * 创建单元
 */
export const createUnit = async (
  projectId: string,
  data: CreateUnitParams
): Promise<UnitData> => {
  return api.post(`/projects/${projectId}/units`, data);
};

/**
 * 获取单元列表
 */
export const getUnitList = async (
  projectId: string,
  page = 1,
  pageSize = 20
): Promise<{ items: UnitData[]; total: number; page: number; page_size: number }> => {
  return api.get(`/projects/${projectId}/units`, {
    params: { page, page_size: pageSize },
  });
};

/**
 * 获取单元详情
 */
export const getUnit = async (
  projectId: string,
  unitId: string
): Promise<UnitData> => {
  return api.get(`/projects/${projectId}/units/${unitId}`);
};

/**
 * 更新单元
 */
export const updateUnit = async (
  projectId: string,
  unitId: string,
  data: UpdateUnitParams
): Promise<UnitData> => {
  return api.put(`/projects/${projectId}/units/${unitId}`, data);
};

/**
 * 删除单元
 */
export const deleteUnit = async (
  projectId: string,
  unitId: string
): Promise<void> => {
  return api.delete(`/projects/${projectId}/units/${unitId}`);
};
