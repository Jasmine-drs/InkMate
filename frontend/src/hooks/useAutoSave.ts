/**
 * 自动保存 Hook - 本地缓存 + 服务器同步
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

interface UseAutoSaveOptions {
  // 章节 ID
  chapterId?: string;
  // 项目 ID
  projectId?: string;
  // 保存间隔（毫秒）
  saveInterval?: number;
  // 内容数据
  content: string;
  // 标题
  title: string;
  // 保存 API 调用
  onSaveToServer?: (data: { title: string; content: string }) => Promise<void>;
}

interface AutoSaveResult {
  // 是否正在保存
  isSaving: boolean;
  // 上次保存时间
  lastSaveTime: Date | null;
  // 本地缓存状态
  hasLocalDraft: boolean;
  // 本地缓存时间
  localDraftTime: Date | null;
  // 保存状态 'idle' | 'saving' | 'saved' | 'error'
  saveStatus: string;
  // 手动保存
  handleSaveNow: () => Promise<void>;
  // 从本地恢复
  restoreFromLocal: () => void;
  // 清除本地缓存
  clearLocalDraft: () => void;
}

/**
 * 获取本地缓存 key
 */
const getStorageKey = (chapterId: string) => `draft_chapter_${chapterId}`;

/**
 * 解析本地缓存数据
 */
interface DraftData {
  title: string;
  content: string;
  savedAt: string;
  projectId?: string;
}

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * 自动保存 Hook
 */
export function useAutoSave(options: UseAutoSaveOptions): AutoSaveResult {
  const {
    chapterId,
    projectId,
    saveInterval = 30000, // 默认 30 秒保存一次
    content,
    title,
    onSaveToServer,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 使用 ref 跟踪内容变化
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const saveTimerRef = useRef<number | null>(null);
  const hasUnsavedChanges = useRef(false);

  // 更新 refs
  useEffect(() => {
    contentRef.current = content;
    titleRef.current = title;
  }, [content, title]);

  /**
   * 保存到本地缓存
   */
  const saveToLocal = useCallback(() => {
    // 支持 chapterId 或 actualChapterId（用于新建章节）
    const idToUse = chapterId;
    if (!idToUse) return;

    const draftData: DraftData = {
      title: titleRef.current,
      content: contentRef.current,
      savedAt: new Date().toISOString(),
      projectId,
    };

    try {
      localStorage.setItem(getStorageKey(idToUse), JSON.stringify(draftData));
      return true;
    } catch (error) {
      // 本地保存失败时静默处理，返回 false
      return false;
    }
  }, [chapterId, projectId]);

  /**
   * 保存到服务器
   */
  const saveToServer = useCallback(async () => {
    if (!onSaveToServer) {
      console.warn('saveToServer: onSaveToServer callback is not provided');
      return;
    }

    // 注意：不强制要求 chapterId，因为 onSaveToServer 内部可能处理新建章节逻辑
    try {
      setSaveStatus('saving');
      setIsSaving(true);

      await onSaveToServer({
        title: titleRef.current,
        content: contentRef.current,
      });

      setLastSaveTime(new Date());
      setSaveStatus('saved');
      hasUnsavedChanges.current = false;

      message.success('保存成功');
    } catch (error) {
      setSaveStatus('error');
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('saveToServer error:', errorMsg);
      message.error(`保存失败：${errorMsg}`);
      // 保存失败时回退到本地缓存
      saveToLocal();
    } finally {
      setIsSaving(false);
    }
  }, [onSaveToServer, saveToLocal]);

  /**
   * 立即保存（先本地，后服务器）
   */
  const handleSaveNow = useCallback(async () => {
    if (isSaving) return;

    // 检查内容是否为空
    const currentContent = contentRef.current?.trim();
    if (!currentContent) {
      message.warning('内容为空，无法保存');
      return;
    }

    // 总是先保存到本地
    saveToLocal();

    // 如果有服务器保存函数，同时保存到服务器
    if (onSaveToServer) {
      await saveToServer();
    } else {
      setLastSaveTime(new Date());
      setSaveStatus('saved');
      message.success('已保存到本地');
    }
  }, [isSaving, saveToLocal, saveToServer, onSaveToServer]);

  /**
   * 从本地缓存恢复
   */
  const restoreFromLocal = useCallback(() => {
    if (!chapterId) return;

    try {
      const saved = localStorage.getItem(getStorageKey(chapterId));
      if (saved) {
        const draft = JSON.parse(saved) as DraftData;
        // 触发内容更新（通过自定义事件）
        window.dispatchEvent(new CustomEvent('restore-draft', {
          detail: { title: draft.title, content: draft.content },
        }));
        message.success('已恢复本地草稿');
      }
    } catch (error) {
      message.error('恢复草稿失败');
    }
  }, [chapterId]);

  /**
   * 清除本地缓存
   */
  const clearLocalDraft = useCallback(() => {
    if (!chapterId) return;
    localStorage.removeItem(getStorageKey(chapterId));
    message.success('本地草稿已清除');
  }, [chapterId]);

  /**
   * 检查是否有本地草稿
   */
  const checkLocalDraft = useCallback(() => {
    if (!chapterId) return false;
    const saved = localStorage.getItem(getStorageKey(chapterId));
    if (!saved) return false;

    try {
      const draft = JSON.parse(saved) as DraftData;
      // 检查是否和本地当前内容不同
      return draft.content !== contentRef.current || draft.title !== titleRef.current;
    } catch {
      return false;
    }
  }, [chapterId]);

  // 使用防抖的 saveToLocal，避免每次输入都保存
  const debouncedSaveToLocal = useCallback(
    debounce(() => {
      saveToLocal();
    }, 1000), // 1 秒防抖
    [saveToLocal]
  );

  // 监听内容变化，设置定时保存
  useEffect(() => {
    if (!chapterId) return;

    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 内容变化时，使用防抖保存到本地（避免频繁写入）
    debouncedSaveToLocal();

    // 设置定时保存到服务器
    saveTimerRef.current = setTimeout(() => {
      if (onSaveToServer) {
        saveToServer();
      }
    }, saveInterval);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [chapterId, content, debouncedSaveToLocal, saveToServer, saveInterval, onSaveToServer]);

  // 监听恢复事件
  useEffect(() => {
    const handleRestore = (_event: Event) => {
      // 静默处理恢复事件，无需日志输出
    };

    window.addEventListener('restore-draft', handleRestore);
    return () => window.removeEventListener('restore-draft', handleRestore);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaveTime,
    hasLocalDraft: checkLocalDraft(),
    localDraftTime: null,
    saveStatus,
    handleSaveNow,
    restoreFromLocal,
    clearLocalDraft,
  };
}

export default useAutoSave;
