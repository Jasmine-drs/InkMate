/**
 * 大纲管理页面
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Typography,
  Button,
  Space,
  Card,
  List,
  Tag,
  Select,
  Empty,
  Spin,
  App,
  Popconfirm,
  Divider,
  Modal,
  Form,
  Input,
  InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  RobotOutlined,
  PartitionOutlined,
} from '@ant-design/icons';
import { getOutlineList, deleteOutline, generateOutline, breakdownOutline } from '@/services/outline';
import { getProject } from '@/services/project';
import { getUnitList } from '@/services/unit';
import { ROUTES } from '@/pages/SettingsEditor';
import './OutlineList.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const outlineTypeLabels: Record<string, { text: string; color: string }> = {
  main: { text: '主线大纲', color: 'red' },
  unit: { text: '单元大纲', color: 'blue' },
  chapter: { text: '章节细纲', color: 'green' },
};

interface GenerateOutlineFormValues {
  theme: string;
  description: string;
  world_view?: string;
  outline_type: string;
  unit_id?: string;
}

interface BreakdownFormValues {
  outline_id: string;
  chapter_count: number;
}

export default function OutlineList() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [generateForm] = Form.useForm<GenerateOutlineFormValues>();
  const [breakdownForm] = Form.useForm<BreakdownFormValues>();
  const generateOutlineType = Form.useWatch('outline_type', generateForm);

  const { data: projectData } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units', id, 'outline-options'],
    queryFn: () => getUnitList(id!, 1, 100),
    enabled: !!id,
  });

  // 获取大纲列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['outlines', id, 'all'],
    queryFn: () => getOutlineList(id!, undefined, null, 1, 100),
    enabled: !!id,
  });

  // 删除大纲
  const deleteMutation = useMutation({
    mutationFn: (outlineId: string) => deleteOutline(id!, outlineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlines', id] });
      message.success('大纲已删除');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      message.error('删除失败：' + errorMessage);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (values: GenerateOutlineFormValues) => generateOutline(id!, values),
    onSuccess: async (outline) => {
      await queryClient.invalidateQueries({ queryKey: ['outlines', id] });
      setGenerateModalOpen(false);
      generateForm.resetFields();
      setTypeFilter(outline.outline_type);
      message.success('AI 大纲已生成');
      navigate(`/project/${id}/outline/${outline.id}`);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'AI 生成失败';
      message.error('AI 生成失败：' + errorMessage);
    },
  });

  const breakdownMutation = useMutation({
    mutationFn: (values: BreakdownFormValues) => breakdownOutline(id!, values),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['outlines', id] });
      setBreakdownModalOpen(false);
      breakdownForm.resetFields();
      setTypeFilter('chapter');
      message.success(`已生成 ${result.count} 个章节细纲`);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '拆解失败';
      message.error('拆解失败：' + errorMessage);
    },
  });

  const filteredItems = typeFilter
    ? data?.items?.filter((item) => item.outline_type === typeFilter)
    : data?.items;
  const breakdownSourceOptions = (data?.items || []).filter((item) => item.outline_type !== 'chapter');

  const openGenerateModal = () => {
    const settings = projectData?.settings as Record<string, unknown> | undefined;
    generateForm.setFieldsValue({
      theme: projectData?.title || '',
      description: projectData?.description || '',
      world_view: (settings?.worldView as string | undefined) || '',
      outline_type: 'main',
      unit_id: undefined,
    });
    setGenerateModalOpen(true);
  };

  const openBreakdownModal = () => {
    breakdownForm.setFieldsValue({
      outline_id: breakdownSourceOptions[0]?.id,
      chapter_count: 10,
    });
    setBreakdownModalOpen(true);
  };

  if (error) {
    return (
      <Layout className="outline-list-layout">
        <div className="empty-container">
          <Title level={4}>加载失败</Title>
          <Text className="empty-text">请刷新页面重试</Text>
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="outline-list-layout">
      {/* 头部导航 */}
      <Header className="outline-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => id && navigate(ROUTES.PROJECT_DETAIL(id))}
            size="large"
            disabled={!id}
          >
            返回
          </Button>
          <Divider type="vertical" />
          <Title level={4} className="header-title">大纲管理</Title>
        </div>
        <div className="header-right">
          <Space wrap>
            <Button
              icon={<RobotOutlined />}
              onClick={openGenerateModal}
            >
              AI 生成大纲
            </Button>
            <Button
              icon={<PartitionOutlined />}
              onClick={openBreakdownModal}
              disabled={breakdownSourceOptions.length === 0}
            >
              拆解章节细纲
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/project/${id}/outline/new`)}
            >
              新建大纲
            </Button>
          </Space>
        </div>
      </Header>

      {/* 主要内容 */}
      <Content className="outline-content">
        <div className="outline-wrapper">
          {/* 筛选 */}
          <Card className="filter-card glass">
            <Space className="filter-space" wrap>
              <Select
                placeholder="大纲类型"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => setTypeFilter(value)}
                value={typeFilter}
                options={[
                  { label: '主线大纲', value: 'main' },
                  { label: '单元大纲', value: 'unit' },
                  { label: '章节细纲', value: 'chapter' },
                ]}
              />
              <Text className="filter-result">
                共 {filteredItems?.length || 0} 个大纲
              </Text>
            </Space>
          </Card>

          {/* 大纲列表 */}
          <Card className="outline-card glass">
            {isLoading ? (
              <div className="loading-container">
                <Spin size="large" tip="加载大纲列表中..." />
              </div>
            ) : !filteredItems?.length ? (
              <Empty
                description={
                  typeFilter
                    ? '没有找到匹配的大纲'
                    : '暂无大纲，开始创建你的第一个大纲吧'
                }
              >
                {!typeFilter && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate(`/project/${id}/outline/new`)}
                  >
                    创建大纲
                  </Button>
                )}
              </Empty>
            ) : (
              <List
                className="outline-list"
                dataSource={filteredItems}
                renderItem={(outline) => (
                  <List.Item
                    className="outline-item"
                    actions={[
                      <Button
                        key="edit"
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/project/${id}/outline/${outline.id}`)}
                      >
                        编辑
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="删除大纲"
                        description={`确定要删除此大纲吗？`}
                        onConfirm={() => deleteMutation.mutate(outline.id)}
                        okText="确定"
                        cancelText="取消"
                        disabled={deleteMutation.isPending}
                      >
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          loading={deleteMutation.isPending}
                        >
                          删除
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className="outline-avatar">
                          <BookOutlined />
                        </div>
                      }
                      title={
                        <Space>
                          <Text strong className="outline-name">
                            {outline.outline_type === 'chapter'
                              ? `第${outline.chapter_number || '?'}章 细纲`
                              : outline.outline_type === 'main'
                              ? '主线大纲'
                              : '单元大纲'}
                          </Text>
                          <Tag color={outlineTypeLabels[outline.outline_type]?.color}>
                            {outlineTypeLabels[outline.outline_type]?.text}
                          </Tag>
                        </Space>
                      }
                      description={
                        outline.content
                          ? outline.content.substring(0, 100) + '...'
                          : '暂无内容'
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      </Content>

      <Modal
        title="AI 生成大纲"
        open={generateModalOpen}
        onCancel={() => setGenerateModalOpen(false)}
        onOk={() => generateForm.submit()}
        confirmLoading={generateMutation.isPending}
        okText="开始生成"
        cancelText="取消"
      >
        <Form
          form={generateForm}
          layout="vertical"
          onFinish={generateMutation.mutate}
        >
          <Form.Item
            name="theme"
            label="主题"
            rules={[{ required: true, message: '请输入大纲主题' }]}
          >
            <Input placeholder="例如：失落王城复苏" />
          </Form.Item>

          <Form.Item
            name="description"
            label="项目简介"
            rules={[{ required: true, message: '请输入项目简介' }]}
          >
            <TextArea rows={4} placeholder="简述故事主线、主要冲突和创作目标" />
          </Form.Item>

          <Form.Item
            name="world_view"
            label="世界观设定"
          >
            <TextArea rows={4} placeholder="可选，补充世界观/时代/力量体系等背景" />
          </Form.Item>

          <Form.Item
            name="outline_type"
            label="生成类型"
            rules={[{ required: true, message: '请选择大纲类型' }]}
          >
            <Select
              options={[
                { label: '主线大纲', value: 'main' },
                { label: '单元大纲', value: 'unit' },
              ]}
            />
          </Form.Item>

          {generateOutlineType === 'unit' && (
            <Form.Item
              name="unit_id"
              label="关联单元"
              rules={[{ required: true, message: '生成单元大纲时请选择单元' }]}
            >
              <Select
                placeholder="请选择单元"
                options={(unitsData?.items || []).map((unit) => ({
                  label: `单元${unit.unit_number}${unit.title ? ` · ${unit.title}` : ''}`,
                  value: unit.id,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="拆解章节细纲"
        open={breakdownModalOpen}
        onCancel={() => setBreakdownModalOpen(false)}
        onOk={() => breakdownForm.submit()}
        confirmLoading={breakdownMutation.isPending}
        okText="开始拆解"
        cancelText="取消"
      >
        <Form
          form={breakdownForm}
          layout="vertical"
          onFinish={breakdownMutation.mutate}
        >
          <Form.Item
            name="outline_id"
            label="源大纲"
            rules={[{ required: true, message: '请选择要拆解的大纲' }]}
          >
            <Select
              placeholder="请选择主线或单元大纲"
              options={breakdownSourceOptions.map((outline) => ({
                label: outline.outline_type === 'main'
                  ? '主线大纲'
                  : `单元大纲${outline.unit_id ? ` · ${outline.unit_id}` : ''}`,
                value: outline.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="chapter_count"
            label="章节数量"
            rules={[{ required: true, message: '请输入章节数量' }]}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
