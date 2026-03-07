/**
 * AI 对话 API 客户端
 * 支持流式对话和历史记录管理
 */
import { api } from '@/utils/request';

export interface ChatMessage {
  id?: string;
  project_id: string;
  chapter_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ChatContextType {
  type: 'general' | 'creation' | 'setting' | 'inspiration' | 'diagnosis';
  project_id?: string;
  chapter_id?: string;
  settings?: Record<string, string>;
  outline?: string;
  characters?: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * 发送对话消息（非流式）
 */
export const chat = async (
  prompt: string,
  context?: ChatContextType
): Promise<{ content: string }> => {
  return api.post('/chat/send', {
    prompt,
    context_type: context?.type || 'general',
    project_id: context?.project_id,
    chapter_id: context?.chapter_id,
    settings: context?.settings,
    outline: context?.outline,
    characters: context?.characters,
  });
};

/**
 * 流式对话
 */
export const chatStream = async (
  prompt: string,
  callbacks: StreamCallbacks,
  context?: ChatContextType,
  signal?: AbortSignal
): Promise<void> => {
  const token = localStorage.getItem('access_token');
  let buffer = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt,
        context_type: context?.type || 'general',
        project_id: context?.project_id,
        chapter_id: context?.chapter_id,
        settings: context?.settings,
        outline: context?.outline,
        characters: context?.characters,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('浏览器不支持流式读取');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 处理 SSE 格式：data: {...}\n
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
                // 还原转义的换行符和引号
                const unescapedToken = parsed.token
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                callbacks.onToken(unescapedToken);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // 忽略解析错误，继续处理
              console.warn('Token 解析失败:', e);
            }
          }
        }
      }
    }

    callbacks.onComplete();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // 用户主动中断
      return;
    }
    callbacks.onError(error as Error);
  }
};

/**
 * 获取对话历史
 */
export const getChatHistory = async (
  projectId: string,
  chapterId?: string,
  page = 1,
  pageSize = 50
): Promise<{ items: ChatMessage[]; total: number }> => {
  return api.get('/chat/history', {
    params: {
      project_id: projectId,
      chapter_id: chapterId,
      page,
      page_size: pageSize,
    },
  });
};

/**
 * 清除对话历史
 */
export const clearChatHistory = async (
  projectId: string,
  chapterId?: string
): Promise<void> => {
  return api.delete('/chat/history', {
    params: {
      project_id: projectId,
      chapter_id: chapterId,
    },
  });
};
