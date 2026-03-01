/**
 * TipTap 富文本编辑器组件
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';
import { Toolbar } from './Toolbar';
import '../pages/Editor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onAIContinue: () => void;
}

export function RichTextEditor({ content, onChange, onSave, onAIContinue }: RichTextEditorProps) {
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
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 监听 content 变化，同步更新编辑器内容（用于从版本历史恢复）
  // 注意：AI 流式续写时不通过此方式更新，而是直接操作编辑器避免光标跳动
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // 保存当前光标位置
      const { from } = editor.state.selection;
      // 设置内容并尝试保持选区
      editor.commands.setContent(content);
      // 恢复光标位置（如果可能）
      editor.commands.setTextSelection(Math.min(from, editor.state.doc.content.size));
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      <Toolbar editor={editor} onSave={onSave} onAIContinue={onAIContinue} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
