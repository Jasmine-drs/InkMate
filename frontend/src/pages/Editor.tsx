/**
 * 章节编辑器页面 - TipTap 富文本编辑器
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Typography,
  Button,
  Input,
  Space,
  message,
  Divider,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  RobotOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { RichTextEditor } from '@/components/RichTextEditor';
import './Editor.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function Editor() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // 加载章节数据（TODO: 从 API 获取）
  useEffect(() => {
    if (chapterId && chapterId !== 'new') {
      // TODO: 调用 API 获取章节内容
      // 暂时使用模拟数据
      setTitle(`第${chapterId}章 示例标题`);
      setContent('<p>这是示例内容，开始你的创作吧...</p>');
    }
  }, [chapterId]);

  // 更新字数统计
  useEffect(() => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    setWordCount(tempDiv.textContent?.length || 0);
  }, [content]);

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Enter AI 续写
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleAIContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: 调用保存 API
      await new Promise(resolve => setTimeout(resolve, 500));
      message.success('保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAIContinue = () => {
    // TODO: AI 续写功能
    message.info('AI 续写功能开发中...');
  };

  return (
    <Layout className="editor-layout">
      <Header className="editor-header">
        <div className="header-left">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/project/${projectId}`)}>
            返回
          </Button>
          <Divider type="vertical" className="header-divider" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="章节标题"
            className="title-input"
            bordered={false}
          />
        </div>
        <div className="header-right">
          <Space>
            <Tag className="shortcut-hint" icon={<KeyOutlined />}>
              Ctrl+S 保存
            </Tag>
            <Tag className="shortcut-hint" icon={<KeyOutlined />}>
              Ctrl+Enter AI 续写
            </Tag>
          </Space>
          <Button
            className="ai-btn"
            icon={<RobotOutlined />}
            onClick={handleAIContinue}
          >
            AI 续写
          </Button>
          <Button
            className="save-btn"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        </div>
      </Header>

      <Content className="editor-content">
        <div className="editor-wrapper">
          <RichTextEditor
            content={content}
            onChange={setContent}
            onSave={handleSave}
            onAIContinue={handleAIContinue}
          />
        </div>
      </Content>

      <Sider
        width={300}
        theme="dark"
        className="editor-sider"
      >
        <div className="sider-content">
          <div className="sider-header">
            <span className="sider-icon">📊</span>
            <Title level={5} className="sider-title">写作统计</Title>
          </div>

          {/* 统计卡片 */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">📝</span>
              <Text className="stat-label">字数统计</Text>
            </div>
            <div className="stat-value">
              {wordCount.toLocaleString()}
              <span className="stat-unit">字</span>
            </div>
          </div>

          <Divider className="sider-divider" />

          {/* 提示卡片 */}
          <div className="tip-card">
            <div className="tip-header">
              <span className="tip-icon">💡</span>
              <Text className="tip-label">写作提示</Text>
            </div>
            <ul className="tip-list">
              <li className="tip-item">
                <div className="tip-dot" />
                <Text className="tip-text">选中文字可使用 AI 改写功能</Text>
              </li>
              <li className="tip-item">
                <div className="tip-dot" />
                <Text className="tip-text">按 Ctrl+Enter 快速续写</Text>
              </li>
              <li className="tip-item">
                <div className="tip-dot" />
                <Text className="tip-text">自动保存每 5 分钟一次</Text>
              </li>
            </ul>
          </div>

          {/* 快速操作 */}
          <div className="quick-actions">
            <Button className="quick-btn" block>
              📖 查看本章大纲
            </Button>
            <Button className="quick-btn" block>
              👥 查看出场角色
            </Button>
            <Button className="quick-btn" block>
              📜 查看版本历史
            </Button>
          </div>
        </div>
      </Sider>
    </Layout>
  );
}
