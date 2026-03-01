/**
 * 导出管理 API 客户端
 * 支持 TXT、EPUB、DOCX 格式导出
 */
import { api } from '@/utils/request';

/**
 * 导出为 TXT 格式
 * @param projectId 项目 ID
 * @returns 下载链接
 */
export const exportToTxt = async (projectId: string): Promise<string> => {
  const response = await api.get(`/export/${projectId}/txt`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response], { type: 'text/plain;charset=utf-8' }));
};

/**
 * 导出为 EPUB 格式
 * @param projectId 项目 ID
 * @returns 下载链接
 */
export const exportToEpub = async (projectId: string): Promise<string> => {
  const response = await api.get(`/export/${projectId}/epub`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response], { type: 'application/epub+zip' }));
};

/**
 * 导出为 DOCX 格式
 * @param projectId 项目 ID
 * @returns 下载链接
 */
export const exportToDocx = async (projectId: string): Promise<string> => {
  const response = await api.get(`/export/${projectId}/docx`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
};

/**
 * 触发文件下载
 * @param url 下载链接
 * @param filename 文件名
 */
export const triggerDownload = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // 释放 URL 对象
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
};
