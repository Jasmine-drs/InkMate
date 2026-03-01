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
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
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
