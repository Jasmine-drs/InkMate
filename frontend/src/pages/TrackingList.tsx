/**
 * 状态追踪管理页面
 * 支持角色状态、伏笔、物品、时间线等追踪管理
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Typography,
  Button,
  Card,
  Table,
  Space,
  Tag,
  Input,
  Select,
  Empty,
  Spin,
  App,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  UserOutlined,
  PushpinOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import {
  getTrackingList,
  deleteTracking,
  type TrackingData,
} from '@/services/tracking';
import { ROUTES } from '@/pages/SettingsEditor';
import TrackingDetailDrawer from '@/components/TrackingDetailDrawer';
import TrackingFormModal from '@/components/TrackingFormModal';
import './TrackingList.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const trackingTypeConfig: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  character_state: {
    label: '角色状态',
    color: 'red',
    icon: <UserOutlined />,
  },
  foreshadowing: {
    label: '伏笔管理',
    color: 'purple',
    icon: <PushpinOutlined />,
  },
  item: {
    label: '物品追踪',
    color: 'orange',
    icon: <GiftOutlined />,
  },
  timeline: {
    label: '时间线',
    color: 'blue',
    icon: <ClockCircleOutlined />,
  },
  unit_progress: {
    label: '单元进度',
    color: 'green',
    icon: <FolderOutlined />,
  },
};

export default function TrackingList() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState<TrackingData | null>(null);

  // 获取追踪列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['tracking', id],
    queryFn: () => getTrackingList(id!, { page: 1, page_size: 100 }),
    enabled: !!id,
  });

  // 删除追踪
  const deleteMutation = useMutation({
    mutationFn: (trackingId: string) => deleteTracking(id!, trackingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking', id] });
      message.success('追踪记录已删除');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      message.error('删除失败：' + errorMessage);
    },
  });

  // 搜索过滤
  const filteredItems = data?.items?.filter((item) => {
    const matchSearch =
      !searchText ||
      item.tracking_type.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.entity_id && item.entity_id.toLowerCase().includes(searchText.toLowerCase()));
    const matchType = !typeFilter || item.tracking_type === typeFilter;
    return matchSearch && matchType;
  });

  // 查看详情
  const handleViewDetail = (record: TrackingData) => {
    setSelectedTracking(record);
    setDetailDrawerOpen(true);
  };

  // 编辑
  const handleEdit = (record: TrackingData) => {
    setSelectedTracking(record);
    setFormModalOpen(true);
  };

  // 新建
  const handleCreate = () => {
    setSelectedTracking(null);
    setFormModalOpen(true);
  };

  // 表单提交成功
  const handleFormSuccess = () => {
    setFormModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['tracking', id] });
    message.success(selectedTracking ? '更新成功' : '创建成功');
  };

  // 表格列定义
  const columns: ColumnsType<TrackingData> = [
    {
      title: '类型',
      dataIndex: 'tracking_type',
      key: 'tracking_type',
      width: 120,
      render: (type: string) => {
        const config = trackingTypeConfig[type] || trackingTypeConfig.character_state;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '关联实体',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 200,
      render: (entityId: string) => entityId || '-',
    },
    {
      title: '来源章节',
      dataIndex: 'chapter_number',
      key: 'chapter_number',
      width: 100,
      render: (num: number) => (num ? `第${num}章` : '-'),
    },
    {
      title: '状态数据',
      dataIndex: 'state_data',
      key: 'state_data',
      ellipsis: true,
      render: (data: Record<string, unknown>) => {
        if (!data) return '-';
        const summary = Object.entries(data)
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return summary || '-';
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (date: string) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除追踪记录"
            description={`确定要删除此追踪记录吗？`}
            onConfirm={() => deleteMutation.mutate(record.id!)}
            okText="删除"
            cancelText="取消"
            disabled={deleteMutation.isPending}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Layout className="tracking-list-layout">
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
    <Layout className="tracking-list-layout">
      {/* 头部导航 */}
      <Header className="tracking-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => id && navigate(ROUTES.PROJECT_DETAIL(id))}
            size="large"
            disabled={!id}
          >
            返回
          </Button>
          <div className="header-title">状态追踪</div>
        </div>
        <div className="header-right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建追踪
          </Button>
        </div>
      </Header>

      {/* 主要内容 */}
      <Content className="tracking-content">
        <div className="tracking-wrapper">
          {/* 搜索和筛选 */}
          <Card className="filter-card glass">
            <Space className="filter-space" wrap>
              <Search
                placeholder="搜索实体 ID 或类型"
                allowClear
                style={{ width: 200 }}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                placeholder="追踪类型"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => setTypeFilter(value)}
                options={Object.entries(trackingTypeConfig).map(([value, { label, icon }]) => ({
                  value,
                  label,
                  icon,
                }))}
              />
              <FilterOutlined />
              <Text className="filter-result">
                共 {filteredItems?.length || 0} 条记录
              </Text>
            </Space>
          </Card>

          {/* 追踪列表 */}
          <Card className="tracking-card glass">
            {isLoading ? (
              <div className="loading-container">
                <Spin size="large" tip="加载追踪列表中..." />
              </div>
            ) : !filteredItems?.length ? (
              <Empty
                description={
                  searchText || typeFilter
                    ? '没有找到匹配的追踪记录'
                    : '暂无追踪记录，开始记录你的故事状态吧'
                }
              >
                {!searchText && !typeFilter && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                  >
                    创建追踪记录
                  </Button>
                )}
              </Empty>
            ) : (
              <Table
                dataSource={filteredItems}
                columns={columns}
                rowKey="id"
                loading={isLoading}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                }}
                className="tracking-table"
              />
            )}
          </Card>
        </div>
      </Content>

      {/* 详情抽屉 */}
      {selectedTracking && (
        <TrackingDetailDrawer
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          tracking={selectedTracking}
          onEdit={() => {
            setDetailDrawerOpen(false);
            handleEdit(selectedTracking);
          }}
        />
      )}

      {/* 编辑/新建表单弹窗 */}
      <TrackingFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        projectId={id}
        tracking={selectedTracking || undefined}
        onSuccess={handleFormSuccess}
      />
    </Layout>
  );
}
