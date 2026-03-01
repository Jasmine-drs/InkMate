/**
 * 项目详情页 - 重构版
 * 墨蓝色主题 + 玻璃态卡片
 */
import { useState } from 'react';
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
  TeamOutlined,
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
                    <div className="empty-module">
                      <div className="module-icon characters">
                        <TeamOutlined />
                      </div>
                      <Title level={5}>暂无角色</Title>
                      <Text className="module-text">创建你的角色卡片，记录人物设定</Text>
                      <Button
                        type="primary"
                        className="create-character-btn"
                        onClick={() => navigate(`/project/${id}/characters`)}
                      >
                        <UserOutlined /> 管理角色
                      </Button>
                    </div>
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
                    <div className="empty-module">
                      <div className="module-icon settings">
                        <SettingOutlined />
                      </div>
                      <Title level={5}>暂无设定</Title>
                      <Text className="module-text">构建你的世界观，让故事更加丰富</Text>
                      <Button
                        type="primary"
                        className="create-setting-btn"
                        onClick={() => id && navigate(ROUTES.SETTINGS_EDITOR(id))}
                      >
                        <SettingOutlined /> 编辑世界观设定
                      </Button>
                    </div>
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
                    <div className="empty-module">
                      <div className="module-icon outlines">
                        <BookOutlined />
                      </div>
                      <Title level={5}>暂无大纲</Title>
                      <Text className="module-text">创建故事大纲，规划剧情发展</Text>
                      <Button
                        type="primary"
                        className="create-outline-btn"
                        onClick={() => navigate(`/project/${id}/outlines`)}
                      >
                        <BookOutlined /> 管理大纲
                      </Button>
                    </div>
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
                    <div className="empty-module">
                      <div className="module-icon units">
                        <FolderOutlined />
                      </div>
                      <Title level={5}>暂无单元</Title>
                      <Text className="module-text">创建单元结构，组织章节内容</Text>
                      <Button
                        type="primary"
                        className="create-unit-btn"
                        onClick={() => navigate(`/project/${id}/units`)}
                      >
                        <FolderOutlined /> 管理单元
                      </Button>
                    </div>
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
                    <div className="empty-module">
                      <div className="module-icon tracking">
                        <LineChartOutlined />
                      </div>
                      <Title level={5}>暂无追踪记录</Title>
                      <Text className="module-text">追踪角色状态、伏笔、物品和时间线</Text>
                      <Button
                        type="primary"
                        className="create-tracking-btn"
                        onClick={() => navigate(`/project/${id}/tracking`)}
                      >
                        <LineChartOutlined /> 管理追踪
                      </Button>
                    </div>
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