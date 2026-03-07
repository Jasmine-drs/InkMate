/**
 * 大纲编辑器页面
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
  Select,
  Divider,
  App,
  Spin,
  Input,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { getOutline, updateOutline, createOutline, getOutlineList } from '@/services/outline';
import { ROUTES } from '@/pages/SettingsEditor';
import './OutlineEditor.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const outlineTypeOptions = [
  { label: '主线大纲', value: 'main' },
  { label: '单元大纲', value: 'unit' },
  { label: '章节细纲', value: 'chapter' },
];

interface OutlineFormValues {
  outline_type: string;
  parent_id?: string | null;
  chapter_number?: number | null;
  content: string;
}

export default function OutlineEditor() {
  const { message } = App.useApp();
  const { id, outlineId } = useParams<{ id: string; outlineId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form] = Form.useForm<OutlineFormValues>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isNew = outlineId === 'new';

  // 获取大纲详情
  const { data, isLoading } = useQuery({
    queryKey: ['outline', id, outlineId],
    queryFn: () => getOutline(id!, outlineId!),
    enabled: !isNew && !!id && !!outlineId,
  });

  const { data: mainOutlinesData } = useQuery({
    queryKey: ['outlines', id, 'main-options'],
    queryFn: () => getOutlineList(id!, 'main', null, 1, 100),
    enabled: !!id,
  });

  // 初始化表单
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        outline_type: data.outline_type,
        parent_id: data.parent_id,
        chapter_number: data.chapter_number,
        content: data.content || '',
      });
    } else if (isNew) {
      // 新建时默认主线大纲
      form.setFieldsValue({
        outline_type: 'main',
        content: '',
      });
    }
  }, [data, form, isNew]);

  // 保存大纲
  const saveMutation = useMutation({
    mutationFn: async (values: OutlineFormValues) => {
      if (isNew) {
        return createOutline(id!, values);
      } else {
        return updateOutline(id!, outlineId!, values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlines', id] });
      message.success(isNew ? '大纲已创建' : '大纲已保存');
      setHasUnsavedChanges(false);
      if (isNew) {
        navigate(`/project/${id}/outlines`);
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
    document.title = isNew ? '新建大纲 - InkMate' : '编辑大纲 - InkMate';
    return () => {
      document.title = 'InkMate';
    };
  }, [isNew]);

  const outlineType = Form.useWatch('outline_type', form);

  if (isLoading) {
    return (
      <Layout className="outline-editor-layout">
        <div className="loading-container">
          <Spin size="large" tip="加载大纲信息..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="outline-editor-layout">
      <Header className="outline-header">
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
            {isNew ? '新建大纲' : '编辑大纲'}
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

      <Content className="outline-content">
        <div className="outline-wrapper">
          <Form
            form={form}
            layout="vertical"
            className="outline-form"
            onValuesChange={handleValuesChange}
            onFinish={saveMutation.mutate}
          >
            {/* 基本信息 */}
            <Card className="settings-card" title={<><BookOutlined className="card-icon basic" />基本信息</>}>
              <Form.Item
                name="outline_type"
                label="大纲类型"
                rules={[{ required: true, message: '请选择大纲类型' }]}
              >
                <Select placeholder="请选择大纲类型">
                  {outlineTypeOptions.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {outlineType === 'chapter' && (
                <Form.Item
                  name="chapter_number"
                  label="章节号"
                  rules={[{ required: true, message: '请输入章节号' }]}
                >
                  <Input type="number" placeholder="请输入章节号" min={1} />
                </Form.Item>
              )}

              {outlineType === 'unit' && (
                <Form.Item
                  name="parent_id"
                  label="所属主线大纲"
                  tooltip="选择该单元大纲所属的主线大纲"
                >
                  <Select
                    placeholder="请选择主线大纲（可选）"
                    allowClear
                    options={(mainOutlinesData?.items || []).map((outline) => ({
                      label: outline.content
                        ? outline.content.slice(0, 40)
                        : '未命名主线大纲',
                      value: outline.id,
                    }))}
                  />
                </Form.Item>
              )}
            </Card>

            {/* 大纲内容 */}
            <Card className="settings-card" title={<><BookOutlined className="card-icon content" />大纲内容</>}>
              <Form.Item
                name="content"
                label="大纲详情"
                rules={[
                  { required: true, message: '请输入大纲内容' },
                  { max: 10000, message: '大纲内容不超过 10000 字' }
                ]}
              >
                <TextArea
                  rows={12}
                  showCount
                  maxLength={10000}
                  placeholder={
                    outlineType === 'main'
                      ? '描述故事的主线剧情，包括起承转合、主要冲突和结局...'
                      : outlineType === 'unit'
                      ? '描述本单元的故事梗概、主要事件和人物变化...'
                      : '描述本章的具体内容，包括场景、对话、情节发展...'
                  }
                />
              </Form.Item>
            </Card>
          </Form>
        </div>
      </Content>
    </Layout>
  );
}
