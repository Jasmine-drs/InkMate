/**
 * AI 改写弹窗组件
 */
import { useState } from 'react';
import { Modal, Form, Input, App } from 'antd';

const { TextArea } = Input;

interface AIActionModalProps {
  visible: boolean;
  selectedText: string;
  action: 'rewrite' | 'expand' | 'polish';
  onClose: () => void;
  onConfirm: (instruction: string) => Promise<void>;
}

const actionTitles: Record<string, string> = {
  rewrite: 'AI 改写',
  expand: 'AI 扩写',
  polish: 'AI 润色',
};

const actionPlaceholders: Record<string, string> = {
  rewrite: '请输入改写要求，例如：让语言更生动、改成第一人称叙述...',
  expand: '请输入扩写方向，例如：增加环境描写、细化人物心理活动...',
  polish: '请输入润色要求，例如：优化语句流畅度、增强画面感...',
};

export function AIActionModal({ visible, selectedText, action, onClose, onConfirm }: AIActionModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onConfirm(values.instruction);
      form.resetFields();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={actionTitles[action] || 'AI 操作'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="选中内容" className="mb-3">
          <div className="selected-text-preview">{selectedText}</div>
        </Form.Item>
        <Form.Item
          name="instruction"
          label="操作要求"
          rules={[{ required: true, message: '请输入操作要求' }]}
        >
          <TextArea
            rows={4}
            placeholder={actionPlaceholders[action] || '请输入要求...'}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
