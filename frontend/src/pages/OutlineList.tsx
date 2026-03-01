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
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { getOutlineList, deleteOutline } from '@/services/outline';
import { ROUTES } from '@/pages/SettingsEditor';
import './OutlineList.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const outlineTypeLabels: Record<string, { text: string; color: string }> = {
  main: { text: '主线大纲', color: 'red' },
  unit: { text: '单元大纲', color: 'blue' },
  chapter: { text: '章节细纲', color: 'green' },
};

export default function OutlineList() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  // 获取大纲列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['outlines', id, typeFilter],
    queryFn: () => getOutlineList(id!, typeFilter, null, 1, 100),
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

  const filteredItems = typeFilter
    ? data?.items?.filter((item) => item.outline_type === typeFilter)
    : data?.items;

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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/project/${id}/outline/new`)}
          >
            新建大纲
          </Button>
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
    </Layout>
  );
}
