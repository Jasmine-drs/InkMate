/**
 * 世界观设定编辑页面
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SettingOutlined,
  FireOutlined,
  BookOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { getProject, updateProject } from '@/services/project';
import './SettingsEditor.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

export default function SettingsEditor() {
  const { message } = App.useApp();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 加载项目设定
  useEffect(() => {
    const loadSettings = async () => {
      if (!projectId) return;

      try {
        const project = await getProject(projectId);
        if (project.settings) {
          form.setFieldsValue(project.settings);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '加载设定失败';
        message.error('加载设定失败：' + errorMessage);
      }
    };

    loadSettings();
  }, [projectId]);

  // 保存设定
  const handleSave = async () => {
    if (!projectId) return;

    setSaving(true);
    try {
      const values = await form.validateFields();
      await updateProject(projectId, { settings: values });
      message.success('设定已保存');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      message.error('保存失败：' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout className="settings-editor-layout">
      <Header className="settings-header">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/project/${projectId}`)}
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
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
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
          >
            {/* 核心设定 */}
            <Card className="settings-card" title={<><FireOutlined className="card-icon core" />核心设定</>}>
              <Form.Item
                name="worldView"
                label="世界观"
                tooltip="故事的整体世界观和核心理念"
              >
                <TextArea
                  rows={4}
                  placeholder="描述故事的世界观，例如：这是一个魔法与科技并存的世界..."
                />
              </Form.Item>

              <Form.Item
                name="timeSetting"
                label="时代设定"
                tooltip="故事发生的时代背景"
              >
                <TextArea
                  rows={3}
                  placeholder="描述时代背景，例如：虚构的中世纪、近未来、末世后..."
                />
              </Form.Item>

              <Form.Item
                name="locationSetting"
                label="地点设定"
                tooltip="故事发生的主要地点"
              >
                <TextArea
                  rows={3}
                  placeholder="描述主要地点，例如：一座漂浮在空中的魔法城市..."
                />
              </Form.Item>
            </Card>

            {/* 力量体系 */}
            <Card className="settings-card" title={<><BookOutlined className="card-icon magic" />力量体系</>}>
              <Form.Item
                name="powerSystem"
                label="力量体系"
                tooltip="世界中的力量等级和规则"
              >
                <TextArea
                  rows={4}
                  placeholder="描述力量体系，例如：魔法师分为学徒、初级、中级、高级..."
                />
              </Form.Item>

              <Form.Item
                name="magic"
                label="魔法/超能力设定"
                tooltip="魔法或超能力的详细设定"
              >
                <TextArea
                  rows={4}
                  placeholder="描述魔法或超能力系统，例如：元素魔法、精神力、异能..."
                />
              </Form.Item>
            </Card>

            {/* 社会结构 */}
            <Card className="settings-card" title={<><UserOutlined className="card-icon social" />社会结构</>}>
              <Form.Item
                name="socialStructure"
                label="社会结构"
                tooltip="社会组织和阶层"
              >
                <TextArea
                  rows={4}
                  placeholder="描述社会结构，例如：帝国制、联邦制、部落联盟..."
                />
              </Form.Item>

              <Form.Item
                name="technology"
                label="科技/文明水平"
                tooltip="科技发展程度"
              >
                <TextArea
                  rows={3}
                  placeholder="描述科技水平，例如：蒸汽朋克、赛博朋克、原始部落..."
                />
              </Form.Item>

              <Form.Item
                name="culture"
                label="文化习俗"
                tooltip="文化传统和习俗"
              >
                <TextArea
                  rows={3}
                  placeholder="描述文化习俗，例如：节日庆典、宗教信仰、生活习惯..."
                />
              </Form.Item>
            </Card>

            {/* 背景设定 */}
            <Card className="settings-card" title={<><EnvironmentOutlined className="card-icon history" />背景设定</>}>
              <Form.Item
                name="history"
                label="历史背景"
                tooltip="世界的历史大事年表"
              >
                <TextArea
                  rows={4}
                  placeholder="描述历史背景，例如：千年前的神魔大战、百年前的工业革命..."
                />
              </Form.Item>

              <Form.Item
                name="creatures"
                label="生物/种族设定"
                tooltip="世界中的生物和种族"
              >
                <TextArea
                  rows={4}
                  placeholder="描述生物种族，例如：人类、精灵、矮人、龙族..."
                />
              </Form.Item>
            </Card>

            {/* 其他设定 */}
            <Card className="settings-card" title={<><SettingOutlined className="card-icon other" />其他设定</>}>
              <Form.Item
                name="other"
                label="其他设定"
                tooltip="其他需要补充的设定"
              >
                <TextArea
                  rows={4}
                  placeholder="记录其他重要设定..."
                />
              </Form.Item>
            </Card>
          </Form>
        </div>
      </Content>
    </Layout>
  );
}
