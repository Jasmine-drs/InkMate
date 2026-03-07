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
  Spin,
  App,
} from 'antd';
import {
  HistoryOutlined,
  RollbackOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import DOMPurify from 'dompurify';
import { getChapterVersions } from '@/services/chapter';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import './VersionHistoryModal.css';

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
  currentContent?: string;
  onClose: () => void;
  onRestore: (version: number, content: string) => void;
}

function extractParagraphs(content: string): string[] {
  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(content || '');

  const blockTexts = Array.from(container.querySelectorAll('h1, h2, h3, p, li, blockquote, pre'))
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() || '')
    .filter(Boolean);

  if (blockTexts.length > 0) {
    return blockTexts;
  }

  const plainText = container.textContent?.replace(/\s+/g, ' ').trim() || '';
  return plainText ? [plainText] : ['无内容'];
}

/**
 * 版本历史对比 Modal
 */
export function VersionHistoryModal({
  visible,
  projectId,
  chapterId,
  currentContent = '',
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const { message } = App.useApp();
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionData | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  // 加载版本历史
  useEffect(() => {
    if (visible && projectId && chapterId) {
      loadVersions();
    }
  }, [visible, projectId, chapterId]);

  useEffect(() => {
    if (!visible) {
      setCompareMode(false);
      setSelectedVersion(null);
    }
  }, [visible]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const result = await getChapterVersions(projectId, chapterId, 1, 50);
      setVersions((result.items || []).map((item) => ({
        id: item.id,
        version_number: item.version_number,
        content: item.content || '',
        created_at: item.created_at || new Date().toISOString(),
      })));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加载版本历史失败';
      message.error('加载版本历史失败：' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (!selectedVersion) return;
    setCompareMode((prev) => !prev);
  };

  const handleRestore = () => {
    if (!selectedVersion) return;
    onRestore(selectedVersion.version_number, selectedVersion.content);
    onClose();
    message.success(`已恢复到版本 ${selectedVersion.version_number}`);
  };

  const currentParagraphs = extractParagraphs(currentContent);
  const selectedParagraphs = selectedVersion ? extractParagraphs(selectedVersion.content) : [];
  const compareRows = selectedVersion
    ? Array.from({ length: Math.max(currentParagraphs.length, selectedParagraphs.length) }, (_, index) => ({
        index,
        current: currentParagraphs[index] || '（无内容）',
        selected: selectedParagraphs[index] || '（无内容）',
      }))
    : [];

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
      width={compareMode ? 1180 : 800}
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
                  // 获取列表中的第一个元素（最新版本）来判断是否是当前版本
                  const currentVersion = versions[0];
                  const isCurrent = currentVersion?.id === version.id;
                  const isSelected = selectedVersion?.id === version.id;
                  return (
                    <List.Item
                      className={`version-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedVersion(version);
                        setCompareMode(false);
                      }}
                    >
                      <Space>
                        <Tag color={isCurrent ? 'green' : 'blue'}>
                          v{version.version_number}
                        </Tag>
                        <Text>
                          {dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                        {isCurrent && <Text type="secondary">（当前版本）</Text>}
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
                  {compareMode ? `版本 ${selectedVersion.version_number} 对比` : `版本 ${selectedVersion.version_number} 预览`}
                </Title>

                {compareMode ? (
                  <div className="version-compare-grid">
                    {compareRows.map((row) => {
                      const changed = row.current !== row.selected;
                      return (
                        <div key={row.index} className="compare-row">
                          <div className={`compare-column ${changed ? 'changed' : ''}`}>
                            <Text className="compare-label">当前内容 · 段落 {row.index + 1}</Text>
                            <div className="compare-text">{row.current}</div>
                          </div>
                          <div className={`compare-column ${changed ? 'changed' : ''}`}>
                            <Text className="compare-label">历史版本 · 段落 {row.index + 1}</Text>
                            <div className="compare-text">{row.selected}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="version-content">
                    <div
                      className="content-preview"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(selectedVersion.content || '<p>无内容</p>'),
                      }}
                    />
                  </div>
                )}

                {/* 对比视图 */}
                <div className="version-compare">
                  <Button
                    type="primary"
                    onClick={handleCompare}
                    icon={<FileTextOutlined />}
                  >
                    {compareMode ? '返回预览' : '对比当前版本'}
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
