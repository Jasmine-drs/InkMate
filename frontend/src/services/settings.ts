/**
 * 设定管理 API 客户端
 */
import { api } from '@/utils/request';

export interface SettingGenerateRequest {
  setting_type: string;
  prompt: string;
  temperature?: number;
}

export interface FullWorldviewGenerateRequest {
  genre: string;
  description: string;
  temperature?: number;
}

export interface SettingConsistencyCheckRequest {
  content_to_check?: string;
}

export interface ConsistencyCheckResult {
  consistent: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * AI 生成单项设定（非流式）
 */
export const generateSetting = async (
  projectId: string,
  data: SettingGenerateRequest
): Promise<{ content: string }> => {
  return api.post(`/projects/${projectId}/settings/generate`, data);
};

/**
 * AI 生成完整世界观
 */
export const generateFullWorldview = async (
  projectId: string,
  data: FullWorldviewGenerateRequest
): Promise<Record<string, string>> => {
  return api.post(`/projects/${projectId}/settings/generate-full`, data);
};

/**
 * 设定一致性检查
 */
export const checkSettingConsistency = async (
  projectId: string,
  data?: SettingConsistencyCheckRequest
): Promise<ConsistencyCheckResult> => {
  return api.post(`/projects/${projectId}/settings/check-consistency`, data || {});
};

/**
 * 流式生成设定
 * 使用 EventSource/SSE 方式
 */
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (content: string) => void;
  onError: (error: Error) => void;
}

export const generateSettingStream = async (
  projectId: string,
  data: SettingGenerateRequest,
  callbacks: StreamCallbacks
): Promise<void> => {
  const token = localStorage.getItem('access_token');

  try {
    const response = await fetch(`/api/projects/${projectId}/settings/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream not supported');
    }

    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 处理缓冲区中的完整行
      let lineEndIndex;
      while ((lineEndIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, lineEndIndex);
        buffer = buffer.slice(lineEndIndex + 1);

        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                // 还原转义的换行符
                const unescapedToken = parsed.token
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                content += unescapedToken;
                callbacks.onToken(unescapedToken);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    }

    callbacks.onComplete(content);
  } catch (error) {
    callbacks.onError(error as Error);
  }
};
