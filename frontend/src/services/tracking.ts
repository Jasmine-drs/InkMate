/**
 * 状态追踪 API 客户端
 */
import { api } from '@/utils/request';

/**
 * 追踪类型常量
 */
export const TrackingType = {
  CHARACTER_STATE: 'character_state',  // 角色状态
  FORESHADOWING: 'foreshadowing',      // 伏笔
  ITEM: 'item',                        // 物品
  TIMELINE: 'timeline',                // 时间线
  UNIT_PROGRESS: 'unit_progress',      // 单元进度
} as const;

export type TrackingType = typeof TrackingType[keyof typeof TrackingType];

/**
 * 状态追踪数据
 */
export interface TrackingData {
  id: string;
  project_id: string;
  tracking_type: string;
  entity_id?: string;
  chapter_number?: number;
  state_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * 创建追踪记录参数
 */
export interface CreateTrackingParams {
  tracking_type: string;
  entity_id?: string;
  chapter_number?: number;
  state_data?: Record<string, unknown>;
}

/**
 * 更新追踪记录参数
 */
export interface UpdateTrackingParams {
  tracking_type?: string;
  entity_id?: string;
  chapter_number?: number;
  state_data?: Record<string, unknown>;
}

/**
 * 从章节提取状态更新请求
 */
export interface TrackingExtractRequest {
  chapter_ids: string[];
  tracking_types?: string[];
}

/**
 * 从章节提取状态更新结果
 */
export interface TrackingExtractResult {
  chapter_id: string;
  chapter_title: string;
  extracted_trackings: CreateTrackingParams[];
}

/**
 * 创建追踪记录
 */
export const createTracking = async (
  projectId: string,
  data: CreateTrackingParams
): Promise<TrackingData> => {
  return api.post(`/projects/${projectId}/tracking`, data);
};

/**
 * 获取追踪记录列表
 */
export const getTrackingList = async (
  projectId: string,
  params?: {
    tracking_type?: string;
    entity_id?: string;
    page?: number;
    page_size?: number;
  }
): Promise<{ items: TrackingData[]; total: number; page: number; page_size: number }> => {
  return api.get(`/projects/${projectId}/tracking`, { params });
};

/**
 * 获取追踪记录详情
 */
export const getTracking = async (
  projectId: string,
  trackingId: string
): Promise<TrackingData> => {
  return api.get(`/projects/${projectId}/tracking/${trackingId}`);
};

/**
 * 更新追踪记录
 */
export const updateTracking = async (
  projectId: string,
  trackingId: string,
  data: UpdateTrackingParams
): Promise<TrackingData> => {
  return api.put(`/projects/${projectId}/tracking/${trackingId}`, data);
};

/**
 * 删除追踪记录
 */
export const deleteTracking = async (
  projectId: string,
  trackingId: string
): Promise<void> => {
  return api.delete(`/projects/${projectId}/tracking/${trackingId}`);
};

/**
 * 获取实体追踪历史
 */
export const getEntityTrackings = async (
  projectId: string,
  entityId: string
): Promise<TrackingData[]> => {
  return api.get(`/projects/${projectId}/tracking/entity/${entityId}`);
};

/**
 * 从章节提取状态更新
 */
export const extractTrackingFromChapters = async (
  projectId: string,
  request: TrackingExtractRequest
): Promise<TrackingExtractResult[]> => {
  return api.post(`/projects/${projectId}/tracking/extract`, request);
};
