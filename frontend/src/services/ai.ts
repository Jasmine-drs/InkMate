/**
 * AI 生成 API 客户端
 */
import { api } from '@/utils/request';

export interface GenerateRequest {
  prompt: string;
  system_prompt?: string;
  context?: string;
  temperature?: number;
}

export interface ChapterGenerateRequest {
  chapter_title: string;
  outline?: string;
  previous_content?: string;
  character_notes?: string;
  style_guide?: string;
}

export interface ContinueRequest {
  content: string;
  outline?: string;
  length?: 'short' | 'medium' | 'long';
}

export interface RewriteRequest {
  content: string;
  instruction: string;
}

export interface ExpandRequest {
  content: string;
  direction?: string;
}

export interface GenerateResponse {
  content: string;
}

/**
 * 通用生成
 */
export const generate = async (data: GenerateRequest): Promise<GenerateResponse> => {
  return api.post('/ai/generate', data);
};

/**
 * 生成章节
 */
export const generateChapter = async (data: ChapterGenerateRequest): Promise<GenerateResponse> => {
  return api.post('/ai/generate/chapter', data);
};

/**
 * AI 续写
 */
export const continueWriting = async (data: ContinueRequest): Promise<GenerateResponse> => {
  return api.post('/ai/continue', data);
};

/**
 * AI 改写
 */
export const rewrite = async (data: RewriteRequest): Promise<GenerateResponse> => {
  return api.post('/ai/rewrite', data);
};

/**
 * AI 扩写
 */
export const expand = async (data: ExpandRequest): Promise<GenerateResponse> => {
  return api.post('/ai/expand', data);
};

/**
 * 流式生成（使用 EventSource 风格的实现）
 * 注意：由于 fetch 的流式读取需要后端支持，这里使用轮询方式模拟
 */
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (content: string) => void;
  onError: (error: Error) => void;
}

/**
 * 流式生成 - 使用 SSE
 */
export const generateStream = async (
  data: GenerateRequest,
  callbacks: StreamCallbacks
): Promise<void> => {
  const token = localStorage.getItem('access_token');

  try {
    const response = await fetch('/api/ai/generate/stream', {
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // 解析 SSE 格式的数据
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const token = line.slice(6);
          if (token && token !== '[DONE]') {
            content += token;
            callbacks.onToken(token);
          }
        }
      }
    }

    callbacks.onComplete(content);
  } catch (error) {
    callbacks.onError(error as Error);
  }
};

/**
 * 流式续写（使用真正的 SSE 流式接口）
 */
export const continueWritingStream = async (
  content: string,
  onToken: (token: string) => void
): Promise<string> => {
  const token = localStorage.getItem('access_token');

  try {
    const response = await fetch('/api/ai/continue/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content, length: 'medium' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream not supported');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // 解析 SSE 格式的数据
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullContent += parsed.token;
                onToken(parsed.token);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    throw error;
  }
};
