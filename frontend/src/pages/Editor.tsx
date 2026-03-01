/**
 * 章节编辑器页面 - TipTap 富文本编辑器
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Typography,
  Button,
  Input,
  Space,
  Divider,
  Tag,
  Popconfirm,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  RobotOutlined,
  KeyOutlined,
  CloudSyncOutlined,
  FileSyncOutlined,
} from '@ant-design/icons';
import { RichTextEditor, insertTokenToEditor, finishEditorStreaming } from '@/components/RichTextEditor';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getChapter, updateChapter, getChapterById, createChapter, getNextChapterNumber } from '@/services/chapter';
import { getProject } from '@/services/project';
import { VersionHistoryModal } from '@/components/VersionHistoryModal';
import { continueWritingStream, type ContinueWritingOptions, StreamingError } from '@/services/ai';
import './Editor.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function Editor() {
  const { message } = App.useApp();
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [versionHistoryVisible, setVersionHistoryVisible] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [projectSettings, setProjectSettings] = useState<Record<string, unknown> | undefined>(undefined);

  // 加载项目设定
  useEffect(() => {
    const loadProjectSettings = async () => {
      if (!projectId) return;
      try {
        const project = await getProject(projectId);
        if (project.settings) {
          setProjectSettings(project.settings as Record<string, unknown>);
        }
      } catch (error) {
        console.error('加载项目设定失败:', error);
      }
    };
    loadProjectSettings();
  }, [projectId]);

  // 自动保存 Hook - 使用 refs 避免竞态条件
  const createdChapterIdRef = useRef<string | undefined>(undefined);
  const isCreatingRef = useRef(false);

  const {
    isSaving,
    lastSaveTime,
    hasLocalDraft,
    handleSaveNow,
    restoreFromLocal,
    clearLocalDraft,
    saveStatus,
  } = useAutoSave({
    chapterId: chapterId && chapterId !== 'new' ? chapterId : createdChapterIdRef.current,
    projectId: projectId,
    saveInterval: 30000, // 30 秒自动保存
    content,
    title,
    onSaveToServer: useCallback(async ({ title, content }: { title: string; content: string }) => {
      if (!projectId) {
        throw new Error('项目 ID 不存在');
      }

      // 如果是新建章节，使用创建接口
      if (!chapterId || chapterId === 'new') {
        // 使用 ref 避免竞态条件
        if (!createdChapterIdRef.current && !isCreatingRef.current) {
          // 添加创建锁，防止重复创建
          isCreatingRef.current = true;
          try {
            // 获取下一个可用章节号
            const chapterNum = await getNextChapterNumber(projectId);
            const result = await createChapter(projectId, {
              chapter_number: chapterNum,
              title,
              content: content || '',
            });
            if (result && result.id) {
              createdChapterIdRef.current = result.id;
              // 更新 URL 为新章节 ID
              navigate(`/editor/${projectId}/${result.id}`, { replace: true });
              return; // 新建成功直接返回，后续逻辑由 Hook 处理
            }
          } finally {
            isCreatingRef.current = false;
          }
        } else if (createdChapterIdRef.current) {
          // 已经有 ID 了，更新章节
          await updateChapter(projectId, createdChapterIdRef.current, { title, content }, true);
        }
        // 如果正在创建中，跳过本次保存（避免竞态）
        return;
      } else {
        // 更新现有章节
        await updateChapter(projectId, chapterId, { title, content }, true);
      }
    }, [projectId, chapterId, navigate]),
  });

  // 加载章节数据
  useEffect(() => {
    const loadChapter = async () => {
      if (!projectId) return;

      // 如果是新建章节
      if (!chapterId || chapterId === 'new') {
        setTitle('');
        setContent('');
        return;
      }

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
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '加载章节失败';
        message.error('加载章节失败，' + errorMessage);
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

  const handleAIContinue = async () => {
    if (wordCount === 0) {
      message.warning('请先输入一些内容再续写');
      return;
    }
    if (isAIGenerating) {
      message.warning('AI 正在生成中，请稍候...');
      return;
    }

    setIsAIGenerating(true);
    const hide = message.loading('AI 正在创作...', 0);

    try {
      // 构建设定联动选项
      const options: ContinueWritingOptions = {};
      if (projectSettings) {
        options.settings = projectSettings as Record<string, string | undefined>;
      }

      await continueWritingStream(content, (token) => {
        // 使用编辑器的流式插入方法，而不是通过 React state
        insertTokenToEditor(token);
      }, options);

      // 完成流式输入
      finishEditorStreaming();

      hide();
      message.success('AI 续写完成');
    } catch (error: unknown) {
      hide();

      // 根据错误类型显示不同的提示信息
      if (error instanceof StreamingError) {
        switch (error.type) {
          case 'aborted':
            // 用户主动中断，不清理内容，保留已生成部分
            message.info('AI 生成已取消');
            break;
          case 'network':
            // 网络错误，提示用户检查网络
            message.error('网络连接中断，请检查网络后重试');
            break;
          case 'server':
            // 服务器错误
            message.error(`服务器错误：${error.message}`);
            break;
          case 'parse':
            // 解析错误，保留已生成内容
            message.warning('数据解析异常，已保留已生成内容');
            break;
          default:
            message.error('AI 续写失败：' + error.message);
        }
      } else {
        message.error('AI 续写失败：' + (error instanceof Error ? error.message : '未知错误'));
      }
    } finally {
      setIsAIGenerating(false);
    }
  };

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
  }, [handleSaveNow, handleAIContinue]);

  // 处理版本恢复
  const handleRestoreVersion = async (versionNum: number, versionContent: string) => {
    // 检查是否有未保存的修改
    const currentContentTrimmed = content.trim();
    const versionContentTrimmed = versionContent.trim();

    if (currentContentTrimmed !== versionContentTrimmed && currentContentTrimmed.length > 0) {
      // 当前内容与版本内容不同，提示用户
      const confirmed = await new Promise<boolean>((resolve) => {
        if (window.confirm('当前内容有未保存的修改，恢复版本将覆盖这些修改。确定要继续吗？')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      if (!confirmed) {
        return;
      }
    }

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
          <Button icon={<ArrowLeftOutlined />} onClick={() => projectId && navigate(`/project/${projectId}`)}>
            返回
          </Button>
          <Divider type="vertical" className="header-divider" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="章节标题"
            className="title-input"
            variant="borderless"
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
                overlayClassName="dark-popconfirm"
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
                overlayClassName="dark-popconfirm"
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
            disabled={wordCount === 0 || isAIGenerating}
          >
            {isAIGenerating ? '生成中...' : 'AI 续写'}
          </Button>
          <Button
            className="save-btn"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveNow}
            loading={isSaving}
            disabled={!projectId || wordCount === 0}
            title={wordCount === 0 ? '内容为空，无法保存' : '保存章节'}
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
            projectId={projectId}
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
                <li className="tip-item" style={{ color: 'var(--warning)' }}>
                  <div className="tip-dot" />
                  <Text className="tip-text" style={{ color: 'var(--warning)' }}>检测到本地草稿，可恢复</Text>
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
