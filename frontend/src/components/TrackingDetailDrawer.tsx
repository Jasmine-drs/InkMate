/**
 * 追踪详情抽屉组件
 */
import { Drawer, Typography, Descriptions, Tag, Space, Button, Divider } from 'antd';
import { EditOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { TrackingData } from '@/services/tracking';

const trackingTypeLabels: Record<string, string> = {
  character_state: '角色状态',
  foreshadowing: '伏笔管理',
  item: '物品追踪',
  timeline: '时间线',
  unit_progress: '单元进度',
};

interface TrackingDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  tracking: TrackingData;
  onEdit: () => void;
}

export default function TrackingDetailDrawer({
  open,
  onClose,
  tracking,
  onEdit,
}: TrackingDetailDrawerProps) {
  return (
    <Drawer
      title="追踪记录详情"
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      extra={
        <Button icon={<EditOutlined />} onClick={onEdit}>
          编辑
        </Button>
      }
    >
      <Typography.Title level={5}>基本信息</Typography.Title>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="类型">
          <Tag>{trackingTypeLabels[tracking.tracking_type] || tracking.tracking_type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="关联实体 ID">
          {tracking.entity_id || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="来源章节">
          {tracking.chapter_number ? `第${tracking.chapter_number}章` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          <Space>
            <ClockCircleOutlined />
            {tracking.created_at ? new Date(tracking.created_at).toLocaleString() : '-'}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          <Space>
            <ClockCircleOutlined />
            {tracking.updated_at ? new Date(tracking.updated_at).toLocaleString() : '-'}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Typography.Title level={5}>状态数据</Typography.Title>
      <div className="tracking-state-data">
        {tracking.state_data ? (
          <pre className="state-data-preview">
            {JSON.stringify(tracking.state_data, null, 2)}
          </pre>
        ) : (
          <Typography.Text type="secondary">无状态数据</Typography.Text>
        )}
      </div>
    </Drawer>
  );
}
