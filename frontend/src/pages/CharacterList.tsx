/**
 * 角色管理页面
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
  Input,
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
  UserOutlined,
} from '@ant-design/icons';
import { getCharacterList, deleteCharacter } from '@/services/character';
import { ROUTES } from '@/pages/SettingsEditor';
import './CharacterList.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const roleTypeLabels: Record<string, { text: string; color: string }> = {
  protagonist: { text: '主角', color: 'red' },
  supporting: { text: '配角', color: 'blue' },
  unit_character: { text: '单元角色', color: 'green' },
};

export default function CharacterList() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState<string | undefined>(undefined);

  // 获取角色列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['characters', id],
    queryFn: () => getCharacterList(id!, 1, 100),
    enabled: !!id,
  });

  // 删除角色
  const deleteMutation = useMutation({
    mutationFn: (characterId: string) => deleteCharacter(id!, characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', id] });
      message.success('角色已删除');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      message.error('删除失败：' + errorMessage);
    },
  });

  // 搜索过滤
  const filteredItems = data?.items?.filter((item) => {
    const matchSearch = !searchText || item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchRoleType = !roleTypeFilter || item.role_type === roleTypeFilter;
    return matchSearch && matchRoleType;
  });

  if (error) {
    return (
      <Layout className="character-list-layout">
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
    <Layout className="character-list-layout">
      {/* 头部导航 */}
      <Header className="character-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(ROUTES.PROJECT_DETAIL(id!))}
            size="large"
          >
            返回
          </Button>
          <Divider type="vertical" />
          <Title level={4} className="header-title">角色管理</Title>
        </div>
        <div className="header-right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/project/${id}/character/new`)}
          >
            新建角色
          </Button>
        </div>
      </Header>

      {/* 主要内容 */}
      <Content className="character-content">
        <div className="character-wrapper">
          {/* 搜索和筛选 */}
          <Card className="filter-card glass">
            <Space className="filter-space" wrap>
              <Search
                placeholder="搜索角色名称"
                allowClear
                style={{ width: 200 }}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                placeholder="角色类型"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => setRoleTypeFilter(value)}
                options={[
                  { label: '主角', value: 'protagonist' },
                  { label: '配角', value: 'supporting' },
                  { label: '单元角色', value: 'unit_character' },
                ]}
              />
              <Text className="filter-result">
                共 {filteredItems?.length || 0} 个角色
              </Text>
            </Space>
          </Card>

          {/* 角色列表 */}
          <Card className="character-card glass">
            {isLoading ? (
              <div className="loading-container">
                <Spin size="large" tip="加载角色列表中..." />
              </div>
            ) : !filteredItems?.length ? (
              <Empty
                description={
                  searchText || roleTypeFilter
                    ? '没有找到匹配的角色'
                    : '暂无角色，开始创建你的第一个角色吧'
                }
              >
                {!searchText && !roleTypeFilter && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate(`/project/${id}/character/new`)}
                  >
                    创建角色
                  </Button>
                )}
              </Empty>
            ) : (
              <List
                className="character-list"
                dataSource={filteredItems}
                renderItem={(character) => (
                  <List.Item
                    className="character-item"
                    actions={[
                      <Button
                        key="edit"
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/project/${id}/character/${character.id}`)}
                      >
                        编辑
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="删除角色"
                        description={`确定要删除角色"${character.name}"吗？`}
                        onConfirm={() => deleteMutation.mutate(character.id!)}
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
                        <div className="character-avatar">
                          <UserOutlined />
                        </div>
                      }
                      title={
                        <Space>
                          <Text strong className="character-name">{character.name}</Text>
                          {character.role_type && (
                            <Tag color={roleTypeLabels[character.role_type]?.color}>
                              {roleTypeLabels[character.role_type]?.text}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        (character.card_data?.brief as string) ||
                        (character.card_data?.description as string) ||
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
