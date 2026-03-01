/**
 * 章节版本历史对比组件
 */
import { useState, useEffect } from 'react';
import {
  Modal,
  List,
  Button,
  Space,
  Tag,
  Typography,
  Empty,
  message,
  Spin,
} from 'antd';
import {
  HistoryOutlined,
  RollbackOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

interface VersionData {
  id?: string;
  version_number: number;
  content: string;
  created_at: string;
}

interface VersionHistoryModalProps {
  visible: boolean;
  projectId: string;
  chapterId: string;
  _currentContent?: string;
  onClose: () => void;
  onRestore: (version: number, content: string) => void;
}

/**
 * 版本历史对比 Modal
 */
export function VersionHistoryModal({
  visible,
  projectId,
  chapterId,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionData | null>(null);
  const [_comparing, setComparing] = useState(false);

  // 加载版本历史
  useEffect(() => {
    if (visible && projectId && chapterId) {
      loadVersions();
    }
  }, [visible, projectId, chapterId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { getChapterVersions } = await import('@/services/chapter');
      const result = await getChapterVersions(projectId, chapterId, 1, 50);
      setVersions((result.items || []).map((item) => ({
        id: item.id,
        version_number: item.version_number,
        content: item.content || '',
        created_at: item.created_at || new Date().toISOString(),
      })));
    } catch (error: any) {
      console.error('加载版本历史失败:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedVersion) return;
    setComparing(true);
    try {
      // TODO: 实现版本对比功能
      message.info('版本对比功能开发中...');
    } finally {
      setComparing(false);
    }
  };

  const handleRestore = () => {
    if (!selectedVersion) return;
    onRestore(selectedVersion.version_number, selectedVersion.content);
    onClose();
    message.success(`已恢复到版本 ${selectedVersion.version_number}`);
  };

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>版本历史</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button
            icon={<RollbackOutlined />}
            onClick={handleRestore}
            disabled={!selectedVersion}
            type="primary"
          >
            恢复此版本
          </Button>
        </Space>
      }
    >
      <div className="version-history">
        {loading ? (
          <Spin tip="加载中..." />
        ) : versions.length === 0 ? (
          <Empty description="暂无版本历史" />
        ) : (
          <div className="version-layout">
            {/* 版本列表 */}
            <div className="version-list">
              <Title level={5}>历史版本</Title>
              <List
                dataSource={versions}
                renderItem={(version) => {
                  const isCurrent = version.version_number === 1; // 假设 version 1 是当前
                  const isSelected = selectedVersion?.id === version.id;
                  return (
                    <List.Item
                      className={`version-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <Space>
                        <Tag color={isCurrent ? 'green' : 'blue'}>
                          v{version.version_number}
                        </Tag>
                        <Text>
                          {dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                        {isSelected && <FileTextOutlined />}
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </div>

            {/* 版本预览 */}
            {selectedVersion && (
              <div className="version-preview">
                <Title level={5}>
                  版本 {selectedVersion.version_number} 预览
                </Title>
                <div className="version-content">
                  <div
                    className="content-preview"
                    dangerouslySetInnerHTML={{
                      __html: selectedVersion.content || '<p>无内容</p>',
                    }}
                  />
                </div>

                {/* 对比视图 */}
                <div className="version-compare">
                  <Button
                    type="primary"
                    onClick={handleCompare}
                    icon={<FileTextOutlined />}
                  >
                    对比当前版本
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default VersionHistoryModal;
