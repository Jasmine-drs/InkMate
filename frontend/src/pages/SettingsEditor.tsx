/**
 * 世界观设定编辑页面
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { AxiosError, isAxiosError } from 'axios';
import {
  Layout,
  Typography,
  Button,
  Space,
  Card,
  Form,
  Input,
  Divider,
  Spin,
  App,
  Modal,
  Progress,
  Tag,
  Alert,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SettingOutlined,
  FireOutlined,
  BookOutlined,
  UserOutlined,
  EnvironmentOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { getProject, updateProject } from '@/services/project';
import {
  generateSettingStream,
  generateFullWorldview,
  checkSettingConsistency,
} from '@/services/settings';
import type { ConsistencyCheckResult } from '@/services/settings';
import './SettingsEditor.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

// 表单值类型定义
interface SettingsFormValues {
  worldView?: string;
  timeSetting?: string;
  locationSetting?: string;
  powerSystem?: string;
  magic?: string;
  socialStructure?: string;
  technology?: string;
  culture?: string;
  history?: string;
  creatures?: string;
  other?: string;
}

// 路由常量
export const ROUTES = {
  PROJECT_DETAIL: (id: string) => `/project/${id}`,
  SETTINGS_EDITOR: (projectId: string) => `/settings/${projectId}`,
  EDITOR: (projectId: string, chapterId: string) => `/editor/${projectId}/${chapterId}`,
} as const;

// 统一的错误处理函数
const handleError = (
  error: unknown,
  action: string,
  message: any,
  navigate?: any
) => {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    switch (axiosError.response?.status) {
      case 404:
        message.error('项目不存在');
        navigate?.('/');
        break;
      case 401:
        message.error('请先登录');
        navigate?.('/login');
        break;
      case 403:
        message.error('无权访问此项目');
        break;
      default:
        message.error(`${action}失败：网络异常`);
    }
  } else if (error instanceof Error) {
    message.error(`${action}失败：${error.message}`);
  } else {
    message.error(`${action}失败：未知错误`);
  }
};

export default function SettingsEditor() {
  const { message } = App.useApp();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [form] = Form.useForm<SettingsFormValues>();

  // AI 生成状态
  const [_generatingField, setGeneratingField] = useState<string | null>(null);
  const [_generatingContent, setGeneratingContent] = useState('');
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyCheckResult | null>(null);
  const [showConsistencyModal, setShowConsistencyModal] = useState(false);
  const [showFullGenerateModal, setShowFullGenerateModal] = useState(false);
  const [fullGenre, setFullGenre] = useState('');
  const [fullDescription, setFullDescription] = useState('');

  // 离开页面确认（React Router v6.4+）
  const blocker = useBlocker(hasUnsavedChanges);
  useEffect(() => {
    if (blocker.state === 'blocked' && hasUnsavedChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要离开吗？');
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, hasUnsavedChanges]);

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

  // 监听表单变化
  const handleValuesChange = () => {
    setHasUnsavedChanges(true);
  };

  // 加载项目设定
  useEffect(() => {
    const loadSettings = async () => {
      if (!projectId) {
        message.error('项目 ID 缺失');
        navigate('/');
        return;
      }

      setLoading(true);
      try {
        const project = await getProject(projectId);
        if (project.settings) {
          form.setFieldsValue(project.settings as SettingsFormValues);
        }
      } catch (error: unknown) {
        handleError(error, '加载设定', message, navigate);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [projectId, navigate, message, form]);

  // 保存设定
  const handleSave = async (silent = false) => {
    if (!projectId) return;

    setSaving(true);
    try {
      await form.validateFields();
      const values = form.getFieldsValue() as Record<string, unknown>;
      await updateProject(projectId, { settings: values });
      setHasUnsavedChanges(false);
      if (!silent) {
        message.success('设定已保存');
      }
    } catch (error: unknown) {
      if (!silent) {
        handleError(error, '保存', message);
      }
    } finally {
      setSaving(false);
    }
  };

  // AI 辅助生成设定（流式）
  const handleAIGenerate = async (field: keyof SettingsFormValues) => {
    const fieldLabels: Record<string, string> = {
      worldView: '世界观',
      timeSetting: '时代设定',
      locationSetting: '地点设定',
      powerSystem: '力量体系',
      magic: '魔法设定',
      socialStructure: '社会结构',
      technology: '科技水平',
      culture: '文化习俗',
      history: '历史背景',
      creatures: '生物种族',
      other: '其他设定',
    };

    setGeneratingField(field);
    setGeneratingContent('');

    const prompt = `请为小说创作${fieldLabels[field] || field}，要求内容丰富多彩，适合奇幻小说使用。`;

    try {
      await generateSettingStream(
        projectId!,
        { setting_type: field, prompt },
        {
          onToken: (token) => {
            setGeneratingContent((prev) => prev + token);
          },
          onComplete: (content) => {
            form.setFieldValue(field, content);
            setHasUnsavedChanges(true);
            setGeneratingField(null);
            setGeneratingContent('');
            message.success(`${fieldLabels[field]} 已生成`);
          },
          onError: (error) => {
            setGeneratingField(null);
            setGeneratingContent('');
            message.error('AI 生成失败：' + error.message);
          },
        }
      );
    } catch (error: unknown) {
      setGeneratingField(null);
      setGeneratingContent('');
      const errorMessage = error instanceof Error ? error.message : '生成失败';
      message.error('AI 生成失败：' + errorMessage);
    }
  };

  // AI 生成完整世界观
  const handleGenerateFullWorldview = async () => {
    if (!fullGenre || !fullDescription) {
      message.error('请填写小说类型和简介');
      return;
    }

    setIsGeneratingFull(true);
    setGeneratingContent('');

    try {
      const result = await generateFullWorldview(projectId!, {
        genre: fullGenre,
        description: fullDescription,
      });

      // 设置表单值
      const formValues: SettingsFormValues = {
        worldView: result.worldView,
        timeSetting: result.timeSetting,
        locationSetting: result.locationSetting,
        powerSystem: result.powerSystem,
        magic: result.magic,
        socialStructure: result.socialStructure,
        technology: result.technology,
        culture: result.culture,
        history: result.history,
        creatures: result.creatures,
      };

      form.setFieldsValue(formValues);
      setHasUnsavedChanges(true);
      setShowFullGenerateModal(false);
      setFullGenre('');
      setFullDescription('');
      message.success('完整世界观已生成');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '生成失败';
      message.error('AI 生成失败：' + errorMessage);
    } finally {
      setIsGeneratingFull(false);
    }
  };

  // 检查设定一致性
  const handleCheckConsistency = async () => {
    if (!projectId) return;

    setIsCheckingConsistency(true);

    try {
      const result = await checkSettingConsistency(projectId);
      setConsistencyResult(result);
      setShowConsistencyModal(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '检查失败';
      message.error('一致性检查失败：' + errorMessage);
    } finally {
      setIsCheckingConsistency(false);
    }
  };

  // 快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 设置页面标题
  useEffect(() => {
    document.title = '世界观设定 - InkMate';
    return () => {
      document.title = 'InkMate';
    };
  }, []);

  // 返回处理
  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要离开吗？');
      if (confirmed) {
        navigate(ROUTES.PROJECT_DETAIL(projectId!));
      }
    } else {
      navigate(ROUTES.PROJECT_DETAIL(projectId!));
    }
  };

  if (loading) {
    return (
      <Layout className="settings-editor-layout">
        <div className="loading-container">
          <Spin size="large" tip="加载设定中..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="settings-editor-layout">
      <Header className="settings-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            size="large"
          >
            返回
          </Button>
          <Divider type="vertical" />
          <Title level={4} className="header-title">世界观设定</Title>
        </div>
        <div className="header-right">
          <Space>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleCheckConsistency}
              loading={isCheckingConsistency}
            >
              一致性检查
            </Button>
            <Button
              type="primary"
              ghost
              icon={<GlobalOutlined />}
              onClick={() => setShowFullGenerateModal(true)}
            >
              AI 生成完整设定
            </Button>
            {hasUnsavedChanges && (
              <span className="unsaved-hint">* 未保存的更改</span>
            )}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave()}
              loading={saving}
            >
              保存设定
            </Button>
          </Space>
        </div>
      </Header>

      <Content className="settings-content">
        <div className="settings-wrapper">
          <Form
            form={form}
            layout="vertical"
            className="settings-form"
            onValuesChange={handleValuesChange}
          >
            {/* 核心设定 */}
            <Card
              className="settings-card"
              title={<><FireOutlined className="card-icon core" />核心设定</>}
              extra={
                <Space size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('worldView')}
                  >
                    AI 世界观
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('timeSetting')}
                  >
                    AI 时代
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('locationSetting')}
                  >
                    AI 地点
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="worldView"
                label="世界观"
                tooltip="故事的整体世界观和核心理念"
                rules={[
                  { max: 2000, message: '世界观描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={2000}
                  placeholder="描述故事的世界观，例如：这是一个魔法与科技并存的世界..."
                />
              </Form.Item>

              <Form.Item
                name="timeSetting"
                label="时代设定"
                tooltip="故事发生的时代背景"
                rules={[
                  { max: 2000, message: '时代设定描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={3}
                  showCount
                  maxLength={2000}
                  placeholder="描述时代背景，例如：虚构的中世纪、近未来、末世后..."
                />
              </Form.Item>

              <Form.Item
                name="locationSetting"
                label="地点设定"
                tooltip="故事发生的主要地点"
                rules={[
                  { max: 2000, message: '地点设定描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={3}
                  showCount
                  maxLength={2000}
                  placeholder="描述主要地点，例如：一座漂浮在空中的魔法城市..."
                />
              </Form.Item>
            </Card>

            {/* 力量体系 */}
            <Card
              className="settings-card"
              title={<><BookOutlined className="card-icon power" />力量体系</>}
              extra={
                <Space size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('powerSystem')}
                  >
                    AI 力量体系
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('magic')}
                  >
                    AI 魔法
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="powerSystem"
                label="力量体系"
                tooltip="世界中的力量等级和规则"
                rules={[
                  { max: 2000, message: '力量体系描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={2000}
                  placeholder="描述力量体系，例如：魔法师分为学徒、初级、中级、高级..."
                />
              </Form.Item>

              <Form.Item
                name="magic"
                label="魔法/超能力设定"
                tooltip="魔法或超能力的详细设定"
                rules={[
                  { max: 2000, message: '魔法设定描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={2000}
                  placeholder="描述魔法或超能力系统，例如：元素魔法、精神力、异能..."
                />
              </Form.Item>
            </Card>

            {/* 社会结构 */}
            <Card
              className="settings-card"
              title={<><UserOutlined className="card-icon social" />社会结构</>}
              extra={
                <Space size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('socialStructure')}
                  >
                    AI 社会
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('technology')}
                  >
                    AI 科技
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('culture')}
                  >
                    AI 文化
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="socialStructure"
                label="社会结构"
                tooltip="社会组织和阶层"
                rules={[
                  { max: 2000, message: '社会结构描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={2000}
                  placeholder="描述社会结构，例如：帝国制、联邦制、部落联盟..."
                />
              </Form.Item>

              <Form.Item
                name="technology"
                label="科技/文明水平"
                tooltip="科技发展程度"
                rules={[
                  { max: 2000, message: '科技水平描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={3}
                  showCount
                  maxLength={2000}
                  placeholder="描述科技水平，例如：蒸汽朋克、赛博朋克、原始部落..."
                />
              </Form.Item>

              <Form.Item
                name="culture"
                label="文化习俗"
                tooltip="文化传统和习俗"
                rules={[
                  { max: 2000, message: '文化习俗描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={3}
                  showCount
                  maxLength={2000}
                  placeholder="描述文化习俗，例如：节日庆典、宗教信仰、生活习惯..."
                />
              </Form.Item>
            </Card>

            {/* 背景设定 */}
            <Card
              className="settings-card"
              title={<><EnvironmentOutlined className="card-icon background" />背景设定</>}
              extra={
                <Space size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('history')}
                  >
                    AI 历史
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('creatures')}
                  >
                    AI 生物
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="history"
                label="历史背景"
                tooltip="世界的历史大事年表"
                rules={[
                  { max: 2000, message: '历史背景描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={2000}
                  placeholder="描述历史背景，例如：千年前的神魔大战、百年前的工业革命..."
                />
              </Form.Item>

              <Form.Item
                name="creatures"
                label="生物/种族设定"
                tooltip="世界中的生物和种族"
                rules={[
                  { max: 2000, message: '生物种族描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={2000}
                  placeholder="描述生物种族，例如：人类、精灵、矮人、龙族..."
                />
              </Form.Item>
            </Card>

            {/* 其他设定 */}
            <Card
              className="settings-card"
              title={<><SettingOutlined className="card-icon misc" />其他设定</>}
              extra={
                <Space size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={() => handleAIGenerate('other')}
                  >
                    AI 其他
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="other"
                label="其他设定"
                tooltip="其他需要补充的设定"
                rules={[
                  { max: 2000, message: '其他设定描述不超过 2000 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={2000}
                  placeholder="记录其他重要设定..."
                />
              </Form.Item>
            </Card>
          </Form>
        </div>
      </Content>

      {/* 一致性检查模态框 */}
      <Modal
        title="设定一致性检查结果"
        open={showConsistencyModal}
        onCancel={() => setShowConsistencyModal(false)}
        footer={
          <Button onClick={() => setShowConsistencyModal(false)}>
            关闭
          </Button>
        }
      >
        {consistencyResult && (
          <div>
            <Alert
              message={consistencyResult.consistent ? '设定一致，未发现矛盾' : '发现潜在问题'}
              type={consistencyResult.consistent ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />

            {consistencyResult.issues.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>发现的问题：</strong>
                <List
                  size="small"
                  dataSource={consistencyResult.issues}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="orange">问题</Tag>
                      {item}
                    </List.Item>
                  )}
                />
              </div>
            )}

            {consistencyResult.suggestions.length > 0 && (
              <div>
                <strong>改进建议：</strong>
                <List
                  size="small"
                  dataSource={consistencyResult.suggestions}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="blue">建议</Tag>
                      {item}
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 完整世界观生成模态框 */}
      <Modal
        title="AI 生成完整世界观"
        open={showFullGenerateModal}
        onCancel={() => setShowFullGenerateModal(false)}
        confirmLoading={isGeneratingFull}
        onOk={handleGenerateFullWorldview}
        okText="生成"
        cancelText="取消"
      >
        <p style={{ marginBottom: 16, color: '#666' }}>
          根据您的小说类型和简介，AI 将为您生成完整的世界观设定，包括时代、地点、力量体系、社会结构等。
        </p>

        <Form layout="vertical">
          <Form.Item label="小说类型" required>
            <Input
              placeholder="例如：奇幻、玄幻、都市、科幻等"
              value={fullGenre}
              onChange={(e) => setFullGenre(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="小说简介" required>
            <TextArea
              rows={4}
              placeholder="请简要描述您的小说构思..."
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
            />
          </Form.Item>
        </Form>

        {isGeneratingFull && (
          <div style={{ marginTop: 16 }}>
            <p>正在生成世界观设定...</p>
            <Progress percent={100} status="active" showInfo={false} />
          </div>
        )}
      </Modal>
    </Layout>
  );
}
