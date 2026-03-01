/**
 * 角色编辑器页面
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Typography,
  Button,
  Space,
  Card,
  Form,
  Input,
  Select,
  Divider,
  App,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { getCharacter, updateCharacter, createCharacter } from '@/services/character';
import { ROUTES } from '@/pages/SettingsEditor';
import './CharacterEditor.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const roleTypeOptions = [
  { label: '主角', value: 'protagonist' },
  { label: '配角', value: 'supporting' },
  { label: '单元角色', value: 'unit_character' },
];

interface CharacterFormValues {
  name: string;
  role_type?: string;
  card_data?: {
    brief?: string;
    description?: string;
    appearance?: string;
    personality?: string;
    background?: string;
    abilities?: string;
    relationships?: string;
    other?: string;
  };
}

export default function CharacterEditor() {
  const { message } = App.useApp();
  const { id, characterId } = useParams<{ id: string; characterId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form] = Form.useForm<CharacterFormValues>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isNew = characterId === 'new';

  // 获取角色详情
  const { data, isLoading } = useQuery({
    queryKey: ['character', id, characterId],
    queryFn: () => getCharacter(id!, characterId!),
    enabled: !isNew && !!id && !!characterId,
  });

  // 初始化表单
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        name: data.name,
        role_type: data.role_type,
        card_data: data.card_data || {},
      });
    }
  }, [data, form]);

  // 保存角色
  const saveMutation = useMutation({
    mutationFn: async (values: CharacterFormValues) => {
      if (isNew) {
        return createCharacter(id!, values);
      } else {
        return updateCharacter(id!, characterId!, values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', id] });
      message.success(isNew ? '角色已创建' : '角色已保存');
      setHasUnsavedChanges(false);
      if (isNew && characterId === 'new') {
        // 新建后跳转到列表页
        navigate(`/project/${id}/characters`);
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      message.error('保存失败：' + errorMessage);
    },
  });

  // 监听表单变化
  const handleValuesChange = () => {
    setHasUnsavedChanges(true);
  };

  // 保存处理
  const handleSave = () => {
    form.submit();
  };

  // 返回处理
  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要离开吗？');
      if (confirmed) {
        navigate(ROUTES.PROJECT_DETAIL(id!));
      }
    } else {
      navigate(ROUTES.PROJECT_DETAIL(id!));
    }
  };

  // 浏览器刷新/关闭前确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 设置页面标题
  useEffect(() => {
    document.title = isNew ? '新建角色 - InkMate' : '编辑角色 - InkMate';
    return () => {
      document.title = 'InkMate';
    };
  }, [isNew]);

  if (isLoading) {
    return (
      <Layout className="character-editor-layout">
        <div className="loading-container">
          <Spin size="large" tip="加载角色信息..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="character-editor-layout">
      <Header className="character-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            size="large"
          >
            返回
          </Button>
          <Divider type="vertical" />
          <Title level={4} className="header-title">
            {isNew ? '新建角色' : '编辑角色'}
          </Title>
        </div>
        <div className="header-right">
          <Space>
            {hasUnsavedChanges && (
              <span className="unsaved-hint">* 未保存的更改</span>
            )}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saveMutation.isPending}
            >
              保存
            </Button>
          </Space>
        </div>
      </Header>

      <Content className="character-content">
        <div className="character-wrapper">
          <Form
            form={form}
            layout="vertical"
            className="character-form"
            onValuesChange={handleValuesChange}
            onFinish={saveMutation.mutate}
          >
            {/* 基本信息 */}
            <Card className="settings-card" title={<><UserOutlined className="card-icon basic" />基本信息</>}>
              <Form.Item
                name="name"
                label="角色姓名"
                rules={[
                  { required: true, message: '请输入角色姓名' },
                  { min: 1, max: 50, message: '角色姓名长度在 1-50 个字符之间' }
                ]}
              >
                <Input placeholder="请输入角色姓名" />
              </Form.Item>

              <Form.Item
                name="role_type"
                label="角色类型"
                tooltip="角色在故事中的定位"
              >
                <Select placeholder="请选择角色类型" allowClear>
                  {roleTypeOptions.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            {/* 角色卡详情 */}
            <Card className="settings-card" title={<><UserOutlined className="card-icon detail" />角色卡详情</>}>
              <Form.Item
                name={['card_data', 'brief']}
                label="角色简介"
                tooltip="一句话概括角色的核心特征"
                rules={[{ max: 200, message: '简介不超过 200 字' }]}
              >
                <TextArea rows={2} showCount maxLength={200} placeholder="用一句话概括角色的核心特征..." />
              </Form.Item>

              <Form.Item
                name={['card_data', 'description']}
                label="角色描述"
                tooltip="角色的详细描述"
                rules={[{ max: 2000, message: '描述不超过 2000 字' }]}
              >
                <TextArea rows={4} showCount maxLength={2000} placeholder="详细描述角色的外貌、气质、给人的印象等..." />
              </Form.Item>

              <Form.Item
                name={['card_data', 'personality']}
                label="性格特点"
                tooltip="角色的性格特征"
                rules={[{ max: 1000, message: '描述不超过 1000 字' }]}
              >
                <TextArea rows={4} showCount maxLength={1000} placeholder="描述角色的性格，如开朗、内向、善良、狡诈等..." />
              </Form.Item>

              <Form.Item
                name={['card_data', 'background']}
                label="背景故事"
                tooltip="角色的过往经历"
                rules={[{ max: 2000, message: '描述不超过 2000 字' }]}
              >
                <TextArea rows={4} showCount maxLength={2000} placeholder="描述角色的成长经历、重要事件等..." />
              </Form.Item>

              <Form.Item
                name={['card_data', 'abilities']}
                label="能力特长"
                tooltip="角色的技能、能力"
                rules={[{ max: 1000, message: '描述不超过 1000 字' }]}
              >
                <TextArea rows={3} showCount maxLength={1000} placeholder="描述角色的特殊能力、技能、专长等..." />
              </Form.Item>

              <Form.Item
                name={['card_data', 'relationships']}
                label="人际关系"
                tooltip="与其他角色的关系"
                rules={[{ max: 1000, message: '描述不超过 1000 字' }]}
              >
                <TextArea rows={3} showCount maxLength={1000} placeholder="描述角色与其他人物的关系..." />
              </Form.Item>

              <Form.Item
                name={['card_data', 'other']}
                label="其他设定"
                tooltip="其他补充信息"
                rules={[{ max: 1000, message: '描述不超过 1000 字' }]}
              >
                <TextArea rows={3} showCount maxLength={1000} placeholder="记录其他需要补充的信息..." />
              </Form.Item>
            </Card>
          </Form>
        </div>
      </Content>
    </Layout>
  );
}
