/**
 * 项目详情页 - 重构版
 * 墨蓝色主题 + 玻璃态卡片
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout, Typography, Spin, Card, Button, Tabs, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
  FireOutlined,
  BookOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { getProject } from '@/services/project';
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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout className="project-detail-layout">
        <div className="loading-container">
          <Spin size="large" />
          <Text className="loading-text">加载中...</Text>
        </div>
      </Layout>
    );
  }

  if (error || !project) {
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
                        onClick={() => navigate(`/editor/${id}/new`)}
                      >
                        <UserOutlined /> 创建角色
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
            ]}
          />
        </div>
      </Content>
    </Layout>
  );
}
