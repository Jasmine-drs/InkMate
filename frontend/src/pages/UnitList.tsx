/**
 * 单元管理页面
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Typography,
  Button,
  Card,
  List,
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
  FolderOutlined,
} from '@ant-design/icons';
import { getUnitList, deleteUnit } from '@/services/unit';
import { ROUTES } from '@/pages/SettingsEditor';
import './UnitList.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function UnitList() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 获取单元列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['units', id],
    queryFn: () => getUnitList(id!, 1, 100),
    enabled: !!id,
  });

  // 删除单元
  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => deleteUnit(id!, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', id] });
      message.success('单元已删除');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      message.error('删除失败：' + errorMessage);
    },
  });

  if (error) {
    return (
      <Layout className="unit-list-layout">
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
    <Layout className="unit-list-layout">
      {/* 头部导航 */}
      <Header className="unit-header">
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
          <Title level={4} className="header-title">单元管理</Title>
        </div>
        <div className="header-right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/project/${id}/unit/new`)}
          >
            新建单元
          </Button>
        </div>
      </Header>

      {/* 主要内容 */}
      <Content className="unit-content">
        <div className="unit-wrapper">
          {/* 单元列表 */}
          <Card className="unit-card glass">
            {isLoading ? (
              <div className="loading-container">
                <Spin size="large" tip="加载单元列表中..." />
              </div>
            ) : !data?.items?.length ? (
              <Empty description="暂无单元">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`/project/${id}/unit/new`)}
                >
                  创建单元
                </Button>
              </Empty>
            ) : (
              <List
                className="unit-list"
                dataSource={data.items}
                renderItem={(unit) => (
                  <List.Item
                    className="unit-item"
                    actions={[
                      <Button
                        key="edit"
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/project/${id}/unit/${unit.id}`)}
                      >
                        编辑
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="删除单元"
                        description={`确定要删除单元"${unit.title}"吗？`}
                        onConfirm={() => deleteMutation.mutate(unit.id!)}
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
                        <div className="unit-avatar">
                          <FolderOutlined />
                        </div>
                      }
                      title={
                        <Typography.Text strong className="unit-name">单元{unit.unit_number}: {unit.title}</Typography.Text>
                      }
                      description={
                        (unit.outline as Record<string, string> | undefined)?.brief ||
                        (unit.outline as Record<string, string> | undefined)?.summary ||
                        '暂无描述'
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
