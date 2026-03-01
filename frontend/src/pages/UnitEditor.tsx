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
  Select,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { getUnit, updateUnit, createUnit, getUnitList, type CreateUnitParams, type UnitData } from '@/services/unit';
import { ROUTES } from '@/pages/SettingsEditor';
import './UnitEditor.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

interface UnitFormValues {
  unit_number?: number;
  title: string;
  unit_type?: string;
  start_chapter?: number;
  end_chapter?: number;
  settings?: Record<string, unknown>;
  outline?: Record<string, unknown>;
}

const unitTypeOptions = [
  { label: '独立单元', value: 'standalone' },
  { label: '主线相关', value: 'mainline_related' },
  { label: '过渡单元', value: 'transition' },
];

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

  // 获取单元列表（用于新单元自动分配序号）
  const { data: unitList } = useQuery({
    queryKey: ['units', id],
    queryFn: () => getUnitList(id!, 1, 1000),
    enabled: isNew && !!id,
  });

  // 初始化表单
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        unit_number: data.unit_number,
        title: data.title,
        unit_type: data.unit_type,
        start_chapter: data.start_chapter,
        end_chapter: data.end_chapter,
        settings: data.settings as any,
        outline: data.outline as any,
      });
    } else if (isNew && unitList) {
      // 新单元自动分配下一个可用序号
      const maxNumber = unitList.items.reduce((max: number, item: UnitData) =>
        Math.max(max, item.unit_number || 0), 0);
      form.setFieldsValue({
        unit_number: maxNumber + 1,
        unit_type: 'standalone',
      });
    }
  }, [data, form, isNew, unitList]);

  // 保存单元
  const saveMutation = useMutation({
    mutationFn: async (values: UnitFormValues) => {
      if (!id) throw new Error('项目 ID 缺失');

      const payload: CreateUnitParams = {
        unit_number: values.unit_number || 1,
        title: values.title,
        unit_type: values.unit_type,
        start_chapter: values.start_chapter,
        end_chapter: values.end_chapter,
        settings: values.settings,
        outline: values.outline,
      };

      if (isNew) {
        return createUnit(id, payload);
      } else {
        return updateUnit(id, unitId!, payload);
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
                name="unit_number"
                label="单元序号"
                rules={[{ required: true, message: '请输入单元序号' }]}
              >
                <Input
                  type="number"
                  placeholder="请输入单元序号"
                  min={1}
                  disabled={!isNew}
                />
              </Form.Item>

              <Form.Item
                name="title"
                label="单元标题"
                rules={[
                  { required: true, message: '请输入单元标题' },
                  { min: 1, max: 200, message: '标题长度在 1-200 个字符之间' }
                ]}
              >
                <Input placeholder="请输入单元标题" />
              </Form.Item>

              <Form.Item
                name="unit_type"
                label="单元类型"
                tooltip="单元与主线剧情的关系"
              >
                <Select placeholder="请选择单元类型">
                  {unitTypeOptions.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider />

              <Form.Item
                name="start_chapter"
                label="起始章节号"
                tooltip="本单元包含的第一个章节号"
              >
                <Input type="number" placeholder="请输入起始章节号" min={1} />
              </Form.Item>

              <Form.Item
                name="end_chapter"
                label="结束章节号"
                tooltip="本单元包含的最后一个章节号"
              >
                <Input type="number" placeholder="请输入结束章节号" min={1} />
              </Form.Item>

              <Form.Item
                name="outline"
                label="单元大纲"
                tooltip="本单元的故事梗概"
              >
                <TextArea rows={6} placeholder="描述本单元的故事梗概、主要事件和人物变化..." />
              </Form.Item>
            </Card>
          </Form>
        </div>
      </Content>
    </Layout>
  );
}
