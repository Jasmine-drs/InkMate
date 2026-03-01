/**
 * 编辑器工具栏
 * Design System v2.0
 */
import { Editor } from '@tiptap/react';
import { Button, Space, Tooltip, Divider } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  MessageOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  BlockOutlined,
  RobotOutlined,
  SaveOutlined,
} from '@ant-design/icons';

interface ToolbarProps {
  editor: Editor;
  onSave: () => void;
  onAIContinue: () => void;
  isEmpty?: boolean;
  projectId?: string;
}

export function Toolbar({ editor, onSave, onAIContinue, isEmpty = false, projectId }: ToolbarProps) {
  return (
    <div className="editor-toolbar">
      <Space size="small" wrap>
        <Tooltip title="加粗 (Ctrl+B)">
          <Button
            type={editor.isActive('bold') ? 'primary' : 'default'}
            size="small"
            icon={<BoldOutlined />}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Tooltip title="斜体 (Ctrl+I)">
          <Button
            type={editor.isActive('italic') ? 'primary' : 'default'}
            size="small"
            icon={<ItalicOutlined />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Tooltip title="下划线">
          <Button
            type={editor.isActive('underline') ? 'primary' : 'default'}
            size="small"
            icon={<UnderlineOutlined />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Tooltip title="删除线">
          <Button
            type={editor.isActive('strike') ? 'primary' : 'default'}
            size="small"
            icon={<StrikethroughOutlined />}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Tooltip title="标题 1">
          <Button
            type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'active-btn' : ''}
          >
            H1
          </Button>
        </Tooltip>

        <Tooltip title="标题 2">
          <Button
            type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'active-btn' : ''}
          >
            H2
          </Button>
        </Tooltip>

        <Tooltip title="标题 3">
          <Button
            type={editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'}
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'active-btn' : ''}
          >
            H3
          </Button>
        </Tooltip>

        <Tooltip title="无序列表">
          <Button
            type={editor.isActive('bulletList') ? 'primary' : 'default'}
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Tooltip title="有序列表">
          <Button
            type={editor.isActive('orderedList') ? 'primary' : 'default'}
            size="small"
            icon={<OrderedListOutlined />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Tooltip title="代码块">
          <Button
            type={editor.isActive('codeBlock') ? 'primary' : 'default'}
            size="small"
            icon={<BlockOutlined />}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Tooltip title="引用">
          <Button
            type={editor.isActive('blockquote') ? 'primary' : 'default'}
            size="small"
            icon={<MessageOutlined />}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'active-btn' : ''}
          />
        </Tooltip>

        <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '0 8px' }} />

        <Tooltip title="AI 续写 (Ctrl+Enter)">
          <Button
            type="primary"
            size="small"
            icon={<RobotOutlined />}
            onClick={onAIContinue}
            disabled={isEmpty}
            className="ai-btn"
          >
            AI 续写
          </Button>
        </Tooltip>

        <Tooltip title="保存 (Ctrl+S)">
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            onClick={onSave}
            disabled={!projectId || isEmpty}
            className="save-btn"
          >
            保存
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}
