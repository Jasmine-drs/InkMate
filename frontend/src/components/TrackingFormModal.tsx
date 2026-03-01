/**
 * 追踪表单弹窗组件
 */
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Space, Button, App } from 'antd';
import type { TrackingData, CreateTrackingParams, UpdateTrackingParams } from '@/services/tracking';
import { createTracking, updateTracking } from '@/services/tracking';

const { TextArea } = Input;

const trackingTypeOptions = [
  { label: '👤 角色状态', value: 'character_state' },
  { label: '📌 伏笔管理', value: 'foreshadowing' },
  { label: '📦 物品追踪', value: 'item' },
  { label: '⏰ 时间线', value: 'timeline' },
  { label: '📁 单元进度', value: 'unit_progress' },
];

interface TrackingFormModalProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  tracking?: TrackingData;
  onSuccess: () => void;
}

export default function TrackingFormModal({
  open,
  onClose,
  projectId,
  tracking,
  onSuccess,
}: TrackingFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 编辑模式时填充表单
  useEffect(() => {
    if (tracking && open) {
      form.setFieldsValue({
        tracking_type: tracking.tracking_type,
        entity_id: tracking.entity_id,
        chapter_number: tracking.chapter_number,
        state_data: JSON.stringify(tracking.state_data, null, 2),
      });
    } else if (!tracking && open) {
      form.resetFields();
    }
  }, [tracking, open, form]);

  // 提交处理
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!projectId) {
      message.error('项目 ID 缺失');
      return;
    }

    setSubmitting(true);

    try {
      let stateData: Record<string, unknown> = {};
      try {
        stateData = JSON.parse(values.state_data as string);
      } catch {
        stateData = { description: values.state_data };
      }

      if (tracking) {
        // 更新
        const updateParams: UpdateTrackingParams = {
          tracking_type: values.tracking_type as string,
          entity_id: values.entity_id as string,
          chapter_number: values.chapter_number as number,
          state_data: stateData,
        };
        await updateTracking(projectId, tracking.id!, updateParams);
      } else {
        // 创建
        const createParams: CreateTrackingParams = {
          tracking_type: values.tracking_type as string,
          entity_id: values.entity_id as string,
          chapter_number: values.chapter_number as number,
          state_data: stateData,
        };
        await createTracking(projectId, createParams);
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={tracking ? '编辑追踪记录' : '新建追踪记录'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          tracking_type: 'character_state',
        }}
      >
        <Form.Item
          name="tracking_type"
          label="追踪类型"
          rules={[{ required: true, message: '请选择追踪类型' }]}
        >
          <Select options={trackingTypeOptions} />
        </Form.Item>

        <Form.Item
          name="entity_id"
          label="关联实体 ID"
          tooltip="关联的角色/物品/单元等 ID"
        >
          <Input placeholder="可选，填入关联实体的 UUID" />
        </Form.Item>

        <Form.Item
          name="chapter_number"
          label="来源章节"
          tooltip="该追踪记录来源的章节号"
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="可选" />
        </Form.Item>

        <Form.Item
          name="state_data"
          label="状态数据"
          tooltip="JSON 格式或简单文本描述"
          rules={[{ required: true, message: '请输入状态数据' }]}
        >
          <TextArea
            rows={8}
            placeholder='请输入状态数据，支持 JSON 格式或简单文本描述
示例 JSON:
{
  "location": "A 城",
  "mood": "焦虑",
  "relationship_B": "恶化"
}'
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={submitting}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {tracking ? '更新' : '创建'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
