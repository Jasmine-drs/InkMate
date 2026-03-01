/**
 * 章节管理 API 客户端
 */
import { api } from '@/utils/request';

export interface ChapterData {
  id?: string;
  project_id?: string;
  unit_id?: string | null;
  chapter_number: number;
  title: string;
  content?: string;
  word_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChapterVersionData {
  id?: string;
  chapter_id: string;
  version_number: number;
  content: string;
  created_at?: string;
}

export interface CreateChapterParams {
  chapter_number: number;
  title: string;
  content?: string;
  unit_id?: string | null;
}

export interface UpdateChapterParams {
  title?: string;
  content?: string;
}

/**
 * 创建章节
 */
export const createChapter = async (
  projectId: string,
  data: CreateChapterParams,
  unitId?: string | null
): Promise<ChapterData> => {
  return api.post(`/projects/${projectId}/chapters`, data, {
    params: unitId ? { unit_id: unitId } : undefined,
  });
};

/**
 * 获取章节列表
 */
export const getChapterList = async (
  projectId: string,
  page = 1,
  pageSize = 20
): Promise<{ items: ChapterData[]; total: number; page: number; page_size: number }> => {
  return api.get(`/projects/${projectId}/chapters`, {
    params: { page, page_size: pageSize },
  });
};

/**
 * 获取章节内容
 */
export const getChapter = async (
  projectId: string,
  chapterNum: number
): Promise<ChapterData> => {
  return api.get(`/projects/${projectId}/chapters/${chapterNum}`);
};

/**
 * 根据 ID 获取章节
 */
export const getChapterById = async (
  projectId: string,
  chapterId: string
): Promise<ChapterData> => {
  // 先获取列表找到章节
  const result = await getChapterList(projectId, 1, 100);
  const chapter = result.items.find((c) => c.id === chapterId);
  if (!chapter) {
    throw new Error('章节不存在');
  }
  return chapter;
};

/**
 * 更新章节内容
 */
export const updateChapter = async (
  projectId: string,
  chapterId: string,
  data: UpdateChapterParams,
  createVersion = true
): Promise<ChapterData> => {
  return api.put(`/projects/${projectId}/chapters/${chapterId}`, data, {
    params: { create_version: createVersion },
  });
};

/**
 * 删除章节
 */
export const deleteChapter = async (
  projectId: string,
  chapterId: string
): Promise<void> => {
  return api.delete(`/projects/${projectId}/chapters/${chapterId}`);
};

/**
 * 获取章节版本历史
 */
export const getChapterVersions = async (
  projectId: string,
  chapterId: string,
  page = 1,
  pageSize = 20
): Promise<{ items: ChapterVersionData[]; total: number; page: number; page_size: number }> => {
  return api.get(`/projects/${projectId}/chapters/${chapterId}/versions`, {
    params: { page, page_size: pageSize },
  });
};

/**
 * 获取指定版本
 */
export const getChapterVersion = async (
  projectId: string,
  chapterId: string,
  versionNum: number
): Promise<ChapterVersionData> => {
  return api.get(`/projects/${projectId}/chapters/${chapterId}/versions/${versionNum}`);
};

/**
 * 保存章节草稿（用于自动保存）
 */
export const saveChapterDraft = async (
  projectId: string,
  chapterId: string,
  title: string,
  content: string
): Promise<ChapterData> => {
  return updateChapter(projectId, chapterId, { title, content }, true);
};

/**
 * 获取下一个可用的章节号
 */
export const getNextChapterNumber = async (
  projectId: string
): Promise<number> => {
  const result = await api.get(`/projects/${projectId}/chapters/next-number`) as { next_number: number };
  return result.next_number;
};
