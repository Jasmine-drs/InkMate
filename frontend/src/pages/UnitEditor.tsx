/**
 * 单元编辑器页面
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
  Divider,
  App,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { getUnit, updateUnit, createUnit } from '@/services/unit';
import { ROUTES } from '@/pages/SettingsEditor';
import './UnitEditor.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

interface UnitFormValues {
  title: string;
  description?: string;
  settings?: Record<string, never>;
}

export default function UnitEditor() {
  const { message } = App.useApp();
  const { id, unitId } = useParams<{ id: string; unitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form] = Form.useForm<UnitFormValues>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isNew = unitId === 'new';

  // 获取单元详情
  const { data, isLoading } = useQuery({
    queryKey: ['unit', id, unitId],
    queryFn: () => getUnit(id!, unitId!),
    enabled: !isNew && !!id && !!unitId,
  });

  // 初始化表单
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        title: data.title,
        description: data.description,
        settings: data.settings as Record<string, never> | undefined,
      });
    }
  }, [data, form, isNew]);

  // 保存单元
  const saveMutation = useMutation({
    mutationFn: async (values: UnitFormValues) => {
      if (isNew) {
        return createUnit(id!, values);
      } else {
        return updateUnit(id!, unitId!, values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', id] });
      message.success(isNew ? '单元已创建' : '单元已保存');
      setHasUnsavedChanges(false);
      if (isNew) {
        navigate(`/project/${id}/units`);
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
    document.title = isNew ? '新建单元 - InkMate' : '编辑单元 - InkMate';
    return () => {
      document.title = 'InkMate';
    };
  }, [isNew]);

  if (isLoading) {
    return (
      <Layout className="unit-editor-layout">
        <div className="loading-container">
          <Spin size="large" tip="加载单元信息..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="unit-editor-layout">
      <Header className="unit-header">
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
            {isNew ? '新建单元' : '编辑单元'}
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

      <Content className="unit-content">
        <div className="unit-wrapper">
          <Form
            form={form}
            layout="vertical"
            className="unit-form"
            onValuesChange={handleValuesChange}
            onFinish={saveMutation.mutate}
          >
            <Card className="settings-card" title={<><FolderOutlined className="card-icon unit" />单元信息</>}>
              <Form.Item
                name="title"
                label="单元标题"
                rules={[
                  { required: true, message: '请输入单元标题' },
                  { min: 1, max: 100, message: '标题长度在 1-100 个字符之间' }
                ]}
              >
                <Input placeholder="请输入单元标题" />
              </Form.Item>

              <Form.Item
                name="description"
                label="单元描述"
                tooltip="单元的故事梗概或说明"
                rules={[{ max: 2000, message: '描述不超过 2000 字' }]}
              >
                <TextArea
                  rows={6}
                  showCount
                  maxLength={2000}
                  placeholder="描述本单元的故事梗概、主要事件和人物变化..."
                />
              </Form.Item>
            </Card>
          </Form>
        </div>
      </Content>
    </Layout>
  );
}
