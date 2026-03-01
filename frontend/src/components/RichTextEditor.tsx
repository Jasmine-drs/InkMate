/**
 * TipTap 富文本编辑器组件
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import '../pages/Editor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onAIContinue: () => void;
  projectId?: string;
}

/**
 * 将纯文本中的换行符转换为 HTML 段落
 * 仅在内容包含换行符时进行转换
 */
function normalizeContent(content: string): string {
  if (!content) return '';

  // 如果已经是 HTML 格式，直接返回
  if (content.includes('<p>') || content.includes('<div>') || content.includes('<h')) {
    return content;
  }

  // 如果是纯文本且包含换行符，转换为段落
  if (content.includes('\n')) {
    const paragraphs = content.split(/\n+/).filter(p => p.trim() !== '');
    return paragraphs.map(p => `<p>${p}</p>`).join('');
  }

  // 单行纯文本，包装成一个段落
  return `<p>${content}</p>`;
}

export function RichTextEditor({ content, onChange, onSave, onAIContinue, projectId }: RichTextEditorProps) {
  const isStreamingRef = useRef(false);
  const lastContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '开始创作你的故事... 选中文字可使用 AI 功能',
      }),
      CharacterCount.configure({
        limit: 100000,
      }),
    ],
    content: normalizeContent(content),
    onUpdate: ({ editor }) => {
      // 流式更新期间不触发 onChange
      if (isStreamingRef.current) return;

      const newHtml = editor.getHTML();
      lastContentRef.current = newHtml;
      onChange(newHtml);
    },
  });

  /**
   * 插入流式 token
   * 直接在当前光标位置插入文本，正确处理换行符
   */
  const insertStreamingToken = useCallback((token: string) => {
    if (!editor) return;

    isStreamingRef.current = true;

    // 处理 token 中的换行符
    if (token.includes('\n')) {
      // 将换行符替换为特殊标记，然后逐段处理
      const parts = token.split('\n');

      parts.forEach((part, index) => {
        if (index === 0) {
          // 第一部分直接插入
          if (part) {
            editor.chain().focus().insertContent(part).run();
          }
        } else {
          // 后续部分：先换行，再插入内容
          // 使用 setHardBreak 在当前段落内换行
          editor.chain().focus().setHardBreak().run();
          if (part) {
            editor.chain().focus().insertContent(part).run();
          }
        }
      });
    } else {
      // 直接插入文本
      editor.chain().focus().insertContent(token).run();
    }

    // 更新引用
    lastContentRef.current = editor.getHTML();

    // 延迟重置流式标志，允许状态更新
    setTimeout(() => {
      isStreamingRef.current = false;
      // 触发一次 onChange 让父组件同步状态
      onChange(editor.getHTML());
    }, 10);
  }, [editor, onChange]);

  /**
   * 完成流式输入
   */
  const finishStreaming = useCallback(() => {
    if (!editor) return;

    isStreamingRef.current = false;
    const finalContent = editor.getHTML();
    lastContentRef.current = finalContent;
    onChange(finalContent);
  }, [editor, onChange]);

  // 监听 content 变化（用于版本恢复等非流式场景）
  useEffect(() => {
    if (!editor) return;

    // 流式更新期间跳过
    if (isStreamingRef.current) return;

    const currentHtml = editor.getHTML();

    // 内容相同时跳过
    if (content === currentHtml || content === lastContentRef.current) return;

    // 检测是否是流式追加（内容增量很小且是前缀匹配）
    const isAppend = content.length > lastContentRef.current.length &&
                     content.startsWith(lastContentRef.current) &&
                     content.length - lastContentRef.current.length < 100;

    if (isAppend) {
      // 流式追加：提取新增部分并插入
      const newPart = content.slice(lastContentRef.current.length);
      // 直接插入新文本（不做 HTML 转换）
      insertStreamingToken(newPart);
    } else {
      // 非流式更新：完整替换内容（如版本恢复）
      const { from } = editor.state.selection;
      editor.commands.setContent(normalizeContent(content));
      lastContentRef.current = editor.getHTML();

      // 尝试恢复光标位置
      const newPos = Math.min(from, editor.state.doc.content.size);
      editor.commands.setTextSelection(newPos);
    }
  }, [content, editor, insertStreamingToken]);

  // 暴露流式插入方法给父组件
  useEffect(() => {
    if (editor) {
      // 通过自定义事件暴露方法
      (window as any).__insertStreamingToken = insertStreamingToken;
      (window as any).__finishStreaming = finishStreaming;
    }
    return () => {
      delete (window as any).__insertStreamingToken;
      delete (window as any).__finishStreaming;
    };
  }, [editor, insertStreamingToken, finishStreaming]);

  if (!editor) {
    return null;
  }

  // 根据字符数判断内容是否为空
  const characterCount = editor.storage.characterCount.characters();
  const isEmpty = characterCount === 0;

  return (
    <div className="rich-text-editor">
      <Toolbar editor={editor} onSave={onSave} onAIContinue={onAIContinue} isEmpty={isEmpty} projectId={projectId} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}

// 导出辅助函数供外部使用
export function insertTokenToEditor(token: string) {
  if ((window as any).__insertStreamingToken) {
    (window as any).__insertStreamingToken(token);
  }
}

export function finishEditorStreaming() {
  if ((window as any).__finishStreaming) {
    (window as any).__finishStreaming();
  }
}