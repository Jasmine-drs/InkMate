/**
 * 仪表盘页面 - 重构版
 * Bento Grid 布局 + 墨蓝色主题
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Row,
  Col,
  Spin,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { getProjectList, createProject, deleteProject, type Project } from '@/services/project';
import { useUserStore } from '@/store/userStore';
import './Dashboard.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const genreLabels: Record<string, string> = {
  fantasy: '奇幻',
  romance: '言情',
  mystery: '悬疑推理',
  scifi: '科幻',
  wuxia: '武侠',
  urban: '都市',
  historical: '历史',
};

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useUserStore();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjectList(),
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setModalOpen(false);
      form.resetFields();
      message.success('项目创建成功');
    },
    onError: () => {
      message.error('创建失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('项目已删除');
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const handleCreate = (values: Record<string, string>) => {
    createMutation.mutate({
      title: values.title,
      genre: values.genre,
      type: values.type,
      description: values.description,
    });
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <Layout className="dashboard-layout">
      {/* 头部导航 */}
      <Header className="dashboard-header">
        <div className="header-left">
          <div className="logo-wrapper">
            <BookOutlined className="logo-icon" />
          </div>
          <div className="brand-text">
            <Title level={4} className="brand-title">InkMate</Title>
            <Text className="brand-subtitle">AI 小说创作助手</Text>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
            <Text className="user-name">{user?.username}</Text>
          </div>
          <Button onClick={handleLogout} className="logout-btn">
            退出
          </Button>
        </div>
      </Header>

      {/* 主要内容 */}
      <Content className="dashboard-content">
        <div className="content-wrapper">
          {/* 页面标题 */}
          <div className="page-header">
            <div>
              <Title level={3} className="page-title">我的项目</Title>
              <Text className="page-subtitle">管理和创作你的小说世界</Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              className="create-btn"
              size="large"
            >
              新建项目
            </Button>
          </div>

          {/* 项目列表 */}
          {isLoading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Text className="loading-text">加载中...</Text>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FolderOpenOutlined />
              </div>
              <Title level={5}>暂无项目</Title>
              <Text className="empty-text">开始创作你的第一部小说吧</Text>
              <Button type="primary" onClick={() => setModalOpen(true)} className="create-first-btn">
                <PlusOutlined /> 创建第一个项目
              </Button>
            </div>
          ) : (
            <Row gutter={[24, 24]} className="project-grid">
              {data?.items.map((project) => (
                <Col key={project.id} xs={24} sm={12} md={8} lg={6}>
                  <ProjectCard
                    project={project}
                    onEdit={() => window.location.href = `/project/${project.id}`}
                    onDelete={() => {
                      Modal.confirm({
                        title: '确认删除',
                        content: `确定要删除项目"${project.title}"吗？`,
                        okText: '删除',
                        cancelText: '取消',
                        okButtonProps: { danger: true },
                        onOk: () => deleteMutation.mutate(project.id),
                      });
                    }}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Content>

      {/* 新建项目弹窗 */}
      <Modal
        title="新建项目"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        className="create-project-modal"
        footer={null}
      >
        <div className="modal-header">
          <FireOutlined className="modal-icon" />
          <div>
            <Title level={4} className="modal-title">开始新的创作</Title>
            <Text className="modal-subtitle">填写以下信息创建你的小说项目</Text>
          </div>
        </div>
        <Form form={form} layout="vertical" onFinish={handleCreate} className="create-form">
          <Form.Item
            name="title"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="例如：我的侦探推理故事" className="custom-input" />
          </Form.Item>

          <Form.Item
            name="type"
            label="项目类型"
            initialValue="novel"
          >
            <Select className="custom-select">
              <Select.Option value="novel">📖 小说</Select.Option>
              <Select.Option value="unit_drama">🎬 单元剧</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="genre" label="题材类型">
            <Select placeholder="请选择或输入题材" className="custom-select" allowClear>
              <Select.Option value="fantasy">奇幻</Select.Option>
              <Select.Option value="romance">言情</Select.Option>
              <Select.Option value="mystery">悬疑推理</Select.Option>
              <Select.Option value="scifi">科幻</Select.Option>
              <Select.Option value="wuxia">武侠</Select.Option>
              <Select.Option value="urban">都市</Select.Option>
              <Select.Option value="historical">历史</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="项目简介">
            <TextArea
              rows={4}
              placeholder="简单介绍一下你的故事..."
              className="custom-input"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <div className="modal-actions">
            <Button onClick={() => {
              setModalOpen(false);
              form.resetFields();
            }} className="cancel-btn">
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending} className="submit-btn">
              创建项目
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}

// 项目卡片组件
function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeLabels: Record<string, string> = {
    novel: '小说',
    unit_drama: '单元剧',
  };

  return (
    <Card className="project-card card-hover-effect" hoverable>
      <div className="project-card-header">
        <div className="project-icon">
          <BookOutlined />
        </div>
        <div className="project-tags">
          <Tag className="type-tag">{typeLabels[project.type] || '小说'}</Tag>
          {project.genre && (
            <Tag className="genre-tag">{genreLabels[project.genre] || project.genre}</Tag>
          )}
        </div>
      </div>
      <div className="project-card-body">
        <Title level={5} className="project-title">{project.title}</Title>
        <Text className="project-description">
          {project.description || '暂无简介'}
        </Text>
      </div>
      <div className="project-card-actions">
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={onEdit}
          className="action-btn"
        >
          进入
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={onDelete}
          className="action-btn danger"
        >
          删除
        </Button>
      </div>
    </Card>
  );
}
