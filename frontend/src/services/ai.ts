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
          const data = line.slice(6);
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                // 还原转义的换行符
                const unescapedToken = parsed.token
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                content += unescapedToken;
                callbacks.onToken(unescapedToken);
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

/**
 * 流式续写（使用真正的 SSE 流式接口）
 */
export interface ContinueWritingOptions {
  outline?: string;      // 大纲
  settings?: {           // 世界观设定
    worldView?: string;
    powerSystem?: string;
    magic?: string;
    [key: string]: string | undefined;
  };
  characters?: string;   // 角色信息
}

/**
 * 流式生成错误类型
 */
export class StreamingError extends Error {
  type: 'network' | 'parse' | 'server' | 'aborted';

  constructor(type: 'network' | 'parse' | 'server' | 'aborted', message: string) {
    super(message);
    this.type = type;
    this.name = 'StreamingError';
  }
}

export const continueWritingStream = async (
  content: string,
  onToken: (token: string) => void,
  options?: ContinueWritingOptions
): Promise<string> => {
  const token = localStorage.getItem('access_token');
  let fullContent = '';
  let buffer = '';

  try {
    const response = await fetch('/api/ai/continue/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        length: 'medium',
        outline: options?.outline,
        settings: options?.settings,
        characters: options?.characters,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 区分服务器错误类型
      if (response.status === 401) {
        throw new StreamingError('server', '认证失败，请重新登录');
      } else if (response.status === 403) {
        throw new StreamingError('server', '无权访问此资源');
      } else if (response.status >= 500) {
        throw new StreamingError('server', `服务器错误 (${response.status})`);
      } else {
        throw new StreamingError('server', `请求失败 (${response.status}): ${errorText}`);
      }
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new StreamingError('network', '浏览器不支持流式读取');
    }

    const decoder = new TextDecoder();

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
          const data = line.slice(6);
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                // 还原转义的换行符
                const unescapedToken = parsed.token
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                fullContent += unescapedToken;
                onToken(unescapedToken);
              }
            } catch (e) {
              // 解析错误，继续处理后续 token
              console.warn('Token 解析失败:', e);
            }
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    // 网络错误或中断时，清理不完整的内容
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new StreamingError('network', '网络连接中断，请检查网络后重试');
    }

    // 如果是 AbortError，表示用户主动中断
    if (error instanceof Error && error.name === 'AbortError') {
      throw new StreamingError('aborted', '生成已取消');
    }

    // 重新抛出已处理的错误
    if (error instanceof StreamingError) {
      throw error;
    }

    // 其他错误
    throw new StreamingError('network', `流式生成失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
};
