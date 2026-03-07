/**
 * 项目详情页 - 重构版
 * 墨蓝色主题 + 玻璃态卡片
 */
import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Typography, Spin, Card, Button, Tabs, Tag, Table, Space, Popconfirm, App, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
  FireOutlined,
  BookOutlined,
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FileOutlined,
  PlusOutlined,
  DownloadOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileTextOutlined as FileTextIcon,
  LineChartOutlined,
} from '@ant-design/icons';
import { getProject } from '@/services/project';
import { getChapterList, deleteChapter, updateChapterStatus, type ChapterData } from '@/services/chapter';
import { getCharacterList, type CharacterData } from '@/services/character';
import { getOutlineList, type OutlineData } from '@/services/outline';
import { getUnitList, type UnitData } from '@/services/unit';
import { getTrackingList, type TrackingData } from '@/services/tracking';
import { exportToTxt, exportToEpub, exportToDocx, triggerDownload } from '@/services/export';
import { ROUTES } from '@/pages/SettingsEditor';
import './ProjectDetail.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const genreLabels: Record<string, string> = {
  fantasy: '奇幻',
  romance: '言情',
  mystery: '悬疑推理',
  scifi: '科幻',
  wuxia: '武侠',
  urban: '都市',
  historical: '历史',
};

const typeLabels: Record<string, string> = {
  novel: '小说',
  unit_drama: '单元剧',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'orange' },
  finalized: { label: '定稿', color: 'green' },
};

const outlineTypeLabels: Record<string, string> = {
  main: '主线大纲',
  unit: '单元大纲',
  chapter: '章节细纲',
};

const trackingTypeLabels: Record<string, string> = {
  character_state: '角色状态',
  foreshadowing: '伏笔',
  item: '物品',
  timeline: '时间线',
  unit_progress: '单元进度',
};

const settingLabels: Record<string, string> = {
  worldView: '世界观',
  timeSetting: '时代设定',
  locationSetting: '地点设定',
  powerSystem: '力量体系',
  magic: '魔法设定',
  socialStructure: '社会结构',
  technology: '科技水平',
  culture: '文化习俗',
  history: '历史背景',
  creatures: '生物种族',
  other: '其他设定',
};

interface OverviewCardProps {
  title: string;
  count: number;
  actionText: string;
  onAction: () => void;
  emptyTitle: string;
  emptyText: string;
  loading: boolean;
  hasError: boolean;
  children: ReactNode;
}

function stripHtml(input?: string): string {
  if (!input) return '';
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatPreviewText(input?: string, maxLength = 80): string {
  const text = stripHtml(input);
  if (!text) return '暂无内容';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatSettingValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join('、');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value ?? '');
}

function formatTrackingSummary(data?: Record<string, unknown>): string {
  if (!data) return '暂无状态摘要';
  const summary = Object.entries(data)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('，');
  return summary || '暂无状态摘要';
}

function OverviewCard({
  title,
  count,
  actionText,
  onAction,
  emptyTitle,
  emptyText,
  loading,
  hasError,
  children,
}: OverviewCardProps) {
  return (
    <Card className="overview-card glass">
      <div className="overview-header">
        <div className="overview-title-group">
          <Title level={5}>{title}</Title>
          <Tag color="blue">{count}</Tag>
        </div>
        <Button type="link" onClick={onAction}>
          {actionText}
        </Button>
      </div>

      {loading ? (
        <div className="overview-state">
          <Spin />
        </div>
      ) : hasError ? (
        <div className="overview-state">
          <Text type="danger">加载失败，请稍后重试</Text>
        </div>
      ) : count === 0 ? (
        <div className="overview-empty">
          <Title level={5}>{emptyTitle}</Title>
          <Text>{emptyText}</Text>
          <Button type="primary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: msgApi } = App.useApp();

  const [isExporting, setIsExporting] = useState(false);

  // 获取项目信息
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  // 获取章节列表
  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', id],
    queryFn: () => getChapterList(id!, 1, 100),
    enabled: !!id,
  });

  const { data: charactersData, isLoading: charactersLoading, error: charactersError } = useQuery({
    queryKey: ['characters', id, 'overview'],
    queryFn: () => getCharacterList(id!, 1, 6),
    enabled: !!id,
  });

  const { data: outlinesData, isLoading: outlinesLoading, error: outlinesError } = useQuery({
    queryKey: ['outlines', id, 'overview'],
    queryFn: () => getOutlineList(id!, undefined, null, 1, 6),
    enabled: !!id,
  });

  const { data: unitsData, isLoading: unitsLoading, error: unitsError } = useQuery({
    queryKey: ['units', id, 'overview'],
    queryFn: () => getUnitList(id!, 1, 6),
    enabled: !!id,
  });

  const { data: trackingData, isLoading: trackingLoading, error: trackingError } = useQuery({
    queryKey: ['tracking', id, 'overview'],
    queryFn: () => getTrackingList(id!, { page: 1, page_size: 6 }),
    enabled: !!id,
  });

  // 导出处理函数
  const handleExport = async (format: 'txt' | 'epub' | 'docx') => {
    if (!id || !project) return;

    setIsExporting(true);
    const hide = msgApi.loading(`正在生成 ${format.toUpperCase()} 文件...`, 0);

    try {
      let url: string;
      let filename: string;

      switch (format) {
        case 'txt':
          url = await exportToTxt(id);
          filename = `${project.title}.txt`;
          break;
        case 'epub':
          url = await exportToEpub(id);
          filename = `${project.title}.epub`;
          break;
        case 'docx':
          url = await exportToDocx(id);
          filename = `${project.title}.docx`;
          break;
        default:
          throw new Error('不支持的导出格式');
      }

      hide();
      triggerDownload(url, filename);
      msgApi.success(`导出成功！已开始下载 ${filename}`);
    } catch (error: unknown) {
      hide();
      const errorMessage = error instanceof Error ? error.message : '导出失败';
      msgApi.error(`导出失败：${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'txt',
      icon: <FileTextIcon />,
      label: '导出为 TXT',
      onClick: () => handleExport('txt'),
    },
    {
      key: 'epub',
      icon: <FilePdfOutlined />,
      label: '导出为 EPUB',
      onClick: () => handleExport('epub'),
    },
    {
      key: 'docx',
      icon: <FileWordOutlined />,
      label: '导出为 DOCX',
      onClick: () => handleExport('docx'),
    },
  ];

  // 删除章节
  const deleteMutation = useMutation({
    mutationFn: (chapterId: string) => deleteChapter(id!, chapterId),
    onSuccess: async () => {
      msgApi.success('章节已删除');
      // 强制重新获取数据
      await queryClient.refetchQueries({ queryKey: ['chapters', id] });
    },
    onError: (error: Error) => {
      msgApi.error('删除失败：' + error.message);
    },
  });

  // 更新章节状态
  const statusMutation = useMutation({
    mutationFn: ({ chapterId, status }: { chapterId: string; status: 'draft' | 'finalized' }) =>
      updateChapterStatus(id!, chapterId, status),
    onSuccess: () => {
      msgApi.success('状态已更新');
      queryClient.invalidateQueries({ queryKey: ['chapters', id] });
    },
    onError: (error: Error) => {
      msgApi.error('更新失败：' + error.message);
    },
  });

  // 章节表格列定义
  const chapterColumns: ColumnsType<ChapterData> = [
    {
      title: '章节号',
      dataIndex: 'chapter_number',
      key: 'chapter_number',
      width: 80,
      render: (num: number) => `第${num}章`,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => title || '无标题',
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 100,
      render: (count: number) => count?.toLocaleString() || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = statusLabels[status] || statusLabels.draft;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/editor/${id}/${record.id}`)}
          >
            编辑
          </Button>
          {record.status === 'draft' ? (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => statusMutation.mutate({ chapterId: record.id!, status: 'finalized' })}
            >
              定稿
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<FileOutlined />}
              onClick={() => statusMutation.mutate({ chapterId: record.id!, status: 'draft' })}
            >
              撤回
            </Button>
          )}
          <Popconfirm
            title="确定删除此章节？"
            description="删除后无法恢复"
            onConfirm={() => deleteMutation.mutate(record.id!)}
            okText="删除"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const chapters = chaptersData?.items || [];
  const characters = charactersData?.items || [];
  const outlines = outlinesData?.items || [];
  const units = unitsData?.items || [];
  const trackings = trackingData?.items || [];

  if (projectLoading) {
    return (
      <Layout className="project-detail-layout">
        <div className="loading-container">
          <Spin size="large" />
          <Text className="loading-text">加载中...</Text>
        </div>
      </Layout>
    );
  }

  if (projectError || !project) {
    return (
      <Layout className="project-detail-layout">
        <div className="empty-container">
          <div className="empty-icon">
            <BookOutlined />
          </div>
          <Title level={4}>项目不存在</Title>
          <Text className="empty-text">该页面可能已被删除或移动</Text>
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </Layout>
    );
  }

  const settingEntries = Object.entries(project.settings || {})
    .filter(([, value]) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined && String(value).trim().length > 0;
    })
    .map(([key, value]) => ({
      key,
      label: settingLabels[key] || key,
      value: formatSettingValue(value),
    }));

  return (
    <Layout className="project-detail-layout">
      {/* 头部导航 */}
      <Header className="project-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            className="back-btn"
            size="large"
          >
            返回
          </Button>
          <div className="project-info">
            <div className="project-icon-wrapper">
              <BookOutlined className="project-icon" />
            </div>
            <div className="project-text">
              <Title level={4} className="project-title">{project.title}</Title>
              <div className="project-meta">
                <Tag className="meta-tag">{typeLabels[project.type] || '小说'}</Tag>
                {project.genre && (
                  <Tag className="meta-tag genre">{genreLabels[project.genre]}</Tag>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="header-right">
          <Space>
            <Dropdown
              menu={{ items: exportMenuItems }}
              disabled={isExporting || chapters.length === 0}
            >
              <Button
                icon={<DownloadOutlined />}
                loading={isExporting}
                disabled={chapters.length === 0}
              >
                导出
                {chapters.length > 0 && ` (${chapters.length}章)`}
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Header>

      {/* 主要内容 */}
      <Content className="project-content">
        <div className="content-wrapper">
          {/* 项目简介卡片 */}
          {project.description && (
            <Card className="intro-card glass">
              <div className="intro-header">
                <FireOutlined className="intro-icon" />
                <Title level={5} className="intro-title">项目简介</Title>
              </div>
              <Text className="intro-text">{project.description}</Text>
            </Card>
          )}

          {/* 功能标签页 */}
          <Tabs
            defaultActiveKey="chapters"
            className="project-tabs"
            items={[
              {
                key: 'chapters',
                label: (
                  <div className="tab-label">
                    <FileTextOutlined />
                    <span>章节管理</span>
                  </div>
                ),
                children: (
                  <div className="tab-content">
                    {chapters.length === 0 && !chaptersLoading ? (
                      <div className="empty-module">
                        <div className="module-icon chapters">
                          <FileTextOutlined />
                        </div>
                        <Title level={5}>暂无章节</Title>
                        <Text className="module-text">开始创建你的第一章故事吧</Text>
                        <Button
                          type="primary"
                          className="create-chapter-btn"
                          onClick={() => navigate(`/editor/${id}/new`)}
                        >
                          <FireOutlined /> 创建第一章
                        </Button>
                      </div>
                    ) : (
                      <Card className="chapter-list-card glass">
                        <div className="chapter-list-header">
                          <Title level={5}>
                            <FileTextOutlined /> 章节列表
                            <Tag color="blue" style={{ marginLeft: 8 }}>{chapters.length} 章</Tag>
                          </Title>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate(`/editor/${id}/new`)}
                          >
                            新建章节
                          </Button>
                        </div>
                        <Table
                          dataSource={chapters}
                          columns={chapterColumns}
                          rowKey="id"
                          loading={chaptersLoading}
                          pagination={false}
                          size="middle"
                          className="chapter-table"
                        />
                      </Card>
                    )}
                  </div>
                ),
              },
              {
                key: 'characters',
                label: (
                  <div className="tab-label">
                    <UserOutlined />
                    <span>角色管理</span>
                  </div>
                ),
                children: (
                  <div className="tab-content">
                    <OverviewCard
                      title="角色概览"
                      count={charactersData?.total || characters.length}
                      actionText="查看全部角色"
                      onAction={() => navigate(`/project/${id}/characters`)}
                      emptyTitle="暂无角色"
                      emptyText="创建角色卡片后，这里会展示最近维护的人物设定。"
                      loading={charactersLoading}
                      hasError={!!charactersError}
                    >
                      <div className="overview-list">
                        {characters.map((character: CharacterData) => (
                          <div key={character.id} className="overview-item">
                            <div className="overview-main">
                              <div className="overview-item-header">
                                <Text strong>{character.name}</Text>
                                {character.role_type && <Tag>{character.role_type}</Tag>}
                              </div>
                              <Text className="overview-description">
                                {formatPreviewText(
                                  (character.card_data?.brief as string | undefined) ||
                                  (character.card_data?.description as string | undefined),
                                  70
                                )}
                              </Text>
                            </div>
                            <Button type="link" onClick={() => navigate(`/project/${id}/character/${character.id}`)}>
                              查看
                            </Button>
                          </div>
                        ))}
                      </div>
                    </OverviewCard>
                  </div>
                ),
              },
              {
                key: 'settings',
                label: (
                  <div className="tab-label">
                    <SettingOutlined />
                    <span>世界观设定</span>
                  </div>
                ),
                children: (
                  <div className="tab-content">
                    <OverviewCard
                      title="设定概览"
                      count={settingEntries.length}
                      actionText="编辑世界观设定"
                      onAction={() => id && navigate(ROUTES.SETTINGS_EDITOR(id))}
                      emptyTitle="暂无设定"
                      emptyText="项目设定会在这里展示已填写的世界观字段。"
                      loading={false}
                      hasError={false}
                    >
                      <div className="settings-grid">
                        {settingEntries.map((entry) => (
                          <div key={entry.key} className="setting-card">
                            <Text className="setting-label">{entry.label}</Text>
                            <Text className="setting-value">{entry.value}</Text>
                          </div>
                        ))}
                      </div>
                    </OverviewCard>
                  </div>
                ),
              },
              {
                key: 'outlines',
                label: (
                  <div className="tab-label">
                    <BookOutlined />
                    <span>大纲管理</span>
                  </div>
                ),
                children: (
                  <div className="tab-content">
                    <OverviewCard
                      title="大纲概览"
                      count={outlinesData?.total || outlines.length}
                      actionText="查看全部大纲"
                      onAction={() => navigate(`/project/${id}/outlines`)}
                      emptyTitle="暂无大纲"
                      emptyText="主线大纲、单元大纲和章节细纲会集中预览在这里。"
                      loading={outlinesLoading}
                      hasError={!!outlinesError}
                    >
                      <div className="overview-list">
                        {outlines.map((outline: OutlineData) => (
                          <div key={outline.id} className="overview-item">
                            <div className="overview-main">
                              <div className="overview-item-header">
                                <Text strong>
                                  {outline.outline_type === 'chapter'
                                    ? `第${outline.chapter_number || '?'}章细纲`
                                    : outlineTypeLabels[outline.outline_type] || '大纲'}
                                </Text>
                                <Tag>{outlineTypeLabels[outline.outline_type] || outline.outline_type}</Tag>
                              </div>
                              <Text className="overview-description">
                                {formatPreviewText(outline.content)}
                              </Text>
                            </div>
                            <Button type="link" onClick={() => navigate(`/project/${id}/outline/${outline.id}`)}>
                              查看
                            </Button>
                          </div>
                        ))}
                      </div>
                    </OverviewCard>
                  </div>
                ),
              },
              {
                key: 'units',
                label: (
                  <div className="tab-label">
                    <FolderOutlined />
                    <span>单元管理</span>
                  </div>
                ),
                children: (
                  <div className="tab-content">
                    <OverviewCard
                      title="单元概览"
                      count={unitsData?.total || units.length}
                      actionText="查看全部单元"
                      onAction={() => navigate(`/project/${id}/units`)}
                      emptyTitle="暂无单元"
                      emptyText="创建单元后，这里会显示章节范围和概要。"
                      loading={unitsLoading}
                      hasError={!!unitsError}
                    >
                      <div className="overview-list">
                        {units.map((unit: UnitData) => (
                          <div key={unit.id} className="overview-item">
                            <div className="overview-main">
                              <div className="overview-item-header">
                                <Text strong>{`单元${unit.unit_number}${unit.title ? ` · ${unit.title}` : ''}`}</Text>
                                {unit.status && <Tag>{unit.status}</Tag>}
                              </div>
                              <Text className="overview-description">
                                {unit.start_chapter && unit.end_chapter
                                  ? `章节范围：第${unit.start_chapter}章 - 第${unit.end_chapter}章`
                                  : formatPreviewText(
                                      (unit.outline as Record<string, unknown> | undefined)?.brief as string | undefined
                                    )}
                              </Text>
                            </div>
                            <Button type="link" onClick={() => navigate(`/project/${id}/unit/${unit.id}`)}>
                              查看
                            </Button>
                          </div>
                        ))}
                      </div>
                    </OverviewCard>
                  </div>
                ),
              },
              {
                key: 'tracking',
                label: (
                  <div className="tab-label">
                    <LineChartOutlined />
                    <span>状态追踪</span>
                  </div>
                ),
                children: (
                  <div className="tab-content">
                    <OverviewCard
                      title="追踪概览"
                      count={trackingData?.total || trackings.length}
                      actionText="查看全部追踪"
                      onAction={() => navigate(`/project/${id}/tracking`)}
                      emptyTitle="暂无追踪记录"
                      emptyText="角色状态、伏笔、物品和时间线的最新记录会显示在这里。"
                      loading={trackingLoading}
                      hasError={!!trackingError}
                    >
                      <div className="overview-list">
                        {trackings.map((tracking: TrackingData) => (
                          <div key={tracking.id} className="overview-item">
                            <div className="overview-main">
                              <div className="overview-item-header">
                                <Text strong>{tracking.entity_id || '未命名实体'}</Text>
                                <Tag>{trackingTypeLabels[tracking.tracking_type] || tracking.tracking_type}</Tag>
                              </div>
                              <Text className="overview-description">
                                {tracking.chapter_number
                                  ? `第${tracking.chapter_number}章 · ${formatTrackingSummary(tracking.state_data)}`
                                  : formatTrackingSummary(tracking.state_data)}
                              </Text>
                            </div>
                            <Button type="link" onClick={() => navigate(`/project/${id}/tracking`)}>
                              查看
                            </Button>
                          </div>
                        ))}
                      </div>
                    </OverviewCard>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Content>
    </Layout>
  );
}
