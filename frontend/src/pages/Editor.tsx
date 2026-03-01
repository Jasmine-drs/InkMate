/**
 * 章节编辑器页面 - TipTap 富文本编辑器
 */
import { useState, useEffect, useCallback } from 'react';
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
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  RobotOutlined,
  KeyOutlined,
  CloudSyncOutlined,
  FileSyncOutlined,
} from '@ant-design/icons';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getChapter, updateChapter, getChapterById, createChapter } from '@/services/chapter';
import { VersionHistoryModal } from '@/components/VersionHistoryModal';
import { continueWritingStream } from '@/services/ai';
import './Editor.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function Editor() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [_loading, setLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [_isNewChapter, setIsNewChapter] = useState(false);
  const [versionHistoryVisible, setVersionHistoryVisible] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // 自动保存 Hook
  const [createdChapterId, setCreatedChapterId] = useState<string | undefined>(undefined);

  const {
    isSaving,
    lastSaveTime,
    hasLocalDraft,
    handleSaveNow,
    restoreFromLocal,
    clearLocalDraft,
    saveStatus,
  } = useAutoSave({
    chapterId: chapterId && chapterId !== 'new' ? chapterId : createdChapterId,
    projectId: projectId,
    saveInterval: 30000, // 30 秒自动保存
    content,
    title,
    onSaveToServer: useCallback(async ({ title, content }: { title: string; content: string }) => {
      if (!projectId) return;

      // 如果是新建章节，使用创建接口
      if (!chapterId || chapterId === 'new') {
        if (!createdChapterId) {
          // 首次创建，提取章节号（从标题或默认 1）
          const chapterNum = 1; // TODO: 获取下一个可用章节号
          const result = await createChapter(projectId, {
            chapter_number: chapterNum,
            title,
            content: content || '',
          });
          if (result && result.id) {
            setCreatedChapterId(result.id);
            // 更新 URL 为新章节 ID
            navigate(`/editor/${projectId}/${result.id}`, { replace: true });
          }
        }
      } else {
        // 更新现有章节
        await updateChapter(projectId, chapterId, { title, content }, true);
      }
    }, [projectId, chapterId, createdChapterId, navigate]),
  });

  // 加载章节数据
  useEffect(() => {
    const loadChapter = async () => {
      if (!projectId) return;

      // 如果是新建章节
      if (!chapterId || chapterId === 'new') {
        setIsNewChapter(true);
        setTitle('');
        setContent('');
        return;
      }

      setLoading(true);
      try {
        // 尝试通过 ID 获取章节（chapterId 可能是数字或 UUID）
        let chapter;
        const chapterNum = parseInt(chapterId, 10);
        if (!isNaN(chapterNum)) {
          chapter = await getChapter(projectId, chapterNum);
        } else {
          chapter = await getChapterById(projectId, chapterId);
        }

        if (chapter) {
          setTitle(chapter.title);
          setContent(chapter.content || '');
          setIsNewChapter(false);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '加载章节失败';
        message.error('加载章节失败，' + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [projectId, chapterId]);

  // 监听恢复草稿事件
  useEffect(() => {
    const handleRestoreDraft = (event: Event) => {
      const customEvent = event as CustomEvent<{ title: string; content: string }>;
      setTitle(customEvent.detail.title);
      setContent(customEvent.detail.content);
    };

    window.addEventListener('restore-draft', handleRestoreDraft as EventListener);
    return () => window.removeEventListener('restore-draft', handleRestoreDraft as EventListener);
  }, []);

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
        handleSaveNow();
      }
      // Ctrl+Enter AI 续写
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleAIContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNow]);

  const handleAIContinue = async () => {
    if (!content) {
      message.warning('请先输入一些内容再续写');
      return;
    }
    if (isAIGenerating) {
      message.info('AI 正在生成中，请稍候...');
      return;
    }

    setIsAIGenerating(true);
    message.loading('AI 正在创作...', 0);

    try {
      await continueWritingStream(content, (token) => {
        setContent((prev) => prev + token);
      });
      message.destroy();
      message.success('AI 续写完成');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'AI 续写失败';
      message.destroy();
      message.error('AI 续写失败：' + errorMessage);
    } finally {
      setIsAIGenerating(false);
    }
  };

  // 处理版本恢复
  const handleRestoreVersion = async (versionNum: number, versionContent: string) => {
    // 恢复版本内容
    setContent(versionContent);

    // 保存恢复后的内容为一个新版本
    if (projectId && chapterId && chapterId !== 'new') {
      try {
        await updateChapter(projectId, chapterId, {
          title,
          content: versionContent
        }, true);
        message.success(`已恢复到版本 ${versionNum} 并保存为新版本`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '恢复版本失败';
        message.error('恢复版本失败：' + errorMessage);
      }
    }
  };

  // 查看大纲处理
  const handleViewOutline = () => {
    if (projectId) {
      // TODO: 导航到大纲页面或打开大纲弹窗
      message.info('大纲功能开发中...');
    }
  };

  // 查看角色处理
  const handleViewCharacters = () => {
    if (projectId) {
      // TODO: 导航到角色页面或打开角色弹窗
      message.info('角色功能开发中...');
    }
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
            {/* 保存状态指示器 */}
            {chapterId && chapterId !== 'new' && (
              <Tag className="save-status" icon={saveStatus === 'saving' ? <CloudSyncOutlined spin /> : <FileSyncOutlined />}>
                {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : saveStatus === 'error' ? '保存失败' : '未保存'}
                {lastSaveTime && ` · ${lastSaveTime.toLocaleTimeString()}`}
              </Tag>
            )}
            <Tag className="shortcut-hint" icon={<KeyOutlined />}>
              Ctrl+S 保存
            </Tag>
            <Tag className="shortcut-hint" icon={<KeyOutlined />}>
              Ctrl+Enter AI 续写
            </Tag>
          </Space>
          {/* 本地草稿操作 */}
          {hasLocalDraft && (
            <Space>
              <Popconfirm
                title="恢复本地草稿"
                description="确定要恢复本地保存的草稿吗？当前内容将会被替换。"
                onConfirm={restoreFromLocal}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<FileSyncOutlined />}>
                  恢复草稿
                </Button>
              </Popconfirm>
              <Popconfirm
                title="清除本地草稿"
                description="确定要清除本地保存的草稿吗？"
                onConfirm={clearLocalDraft}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<CloudSyncOutlined />}>
                  清除草稿
                </Button>
              </Popconfirm>
            </Space>
          )}
          <Button
            className="ai-btn"
            icon={<RobotOutlined />}
            onClick={handleAIContinue}
            loading={isAIGenerating}
            disabled={!content || isAIGenerating}
          >
            {isAIGenerating ? '生成中...' : 'AI 续写'}
          </Button>
          <Button
            className="save-btn"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveNow}
            loading={isSaving}
            disabled={!projectId}
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </Header>

      <Content className="editor-content">
        <div className="editor-wrapper">
          <RichTextEditor
            content={content}
            onChange={setContent}
            onSave={handleSaveNow}
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
                <Text className="tip-text">自动保存每 30 秒一次（Ctrl+S 手动保存）</Text>
              </li>
              {hasLocalDraft && (
                <li className="tip-item" style={{ color: '#faad14' }}>
                  <div className="tip-dot" />
                  <Text className="tip-text" style={{ color: '#faad14' }}>检测到本地草稿，可恢复</Text>
                </li>
              )}
            </ul>
          </div>

          {/* 快速操作 */}
          <div className="quick-actions">
            <Button className="quick-btn" block onClick={handleViewOutline}>
              📖 查看本章大纲
            </Button>
            <Button className="quick-btn" block onClick={handleViewCharacters}>
              👥 查看出场角色
            </Button>
            <Button
              className="quick-btn"
              block
              onClick={() => setVersionHistoryVisible(true)}
            >
              📜 查看版本历史
            </Button>
          </div>
        </div>
      </Sider>

      {/* 版本历史 Modal */}
      {chapterId && chapterId !== 'new' && (
        <VersionHistoryModal
          visible={versionHistoryVisible}
          projectId={projectId!}
          chapterId={chapterId}
          onClose={() => setVersionHistoryVisible(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </Layout>
  );
}
