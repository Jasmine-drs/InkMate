/**
 * AI 对话助手模态框
 * 支持 5 种对话模式：通用咨询、创作咨询、设定查询、灵感激发、问题诊断
 */
import { useState, useRef, useEffect } from 'react';
import { Modal, Input, Button, Space, Select, Spin, Typography, App } from 'antd';
import { RobotOutlined, SendOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons';
import { chatStream, type ChatContextType, type StreamCallbacks } from '@/services/chat';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  projectId?: string;
  chapterId?: string;
  initialContext?: {
    content?: string;
    settings?: Record<string, string>;
  };
}

type ContextMode = 'general' | 'creation' | 'setting' | 'inspiration' | 'diagnosis';

const contextModeLabels: Record<ContextMode, string> = {
  general: '💬 通用咨询',
  creation: '✍️ 创作咨询',
  setting: '🌍 设定查询',
  inspiration: '💡 灵感激发',
  diagnosis: '🔍 问题诊断',
};

export default function AIChatModal({
  visible,
  onClose,
  projectId,
  chapterId,
  initialContext: _initialContext,
}: AIChatModalProps) {
  const { message } = App.useApp();
  const [contextMode, setContextMode] = useState<ContextMode>('general');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingResponseRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 重置对话
  const handleClearHistory = () => {
    setMessages([]);
    setCurrentResponse('');
    streamingResponseRef.current = '';
    message.success('对话已清空');
  };

  const appendStreamingResponse = () => {
    const content = streamingResponseRef.current;
    if (!content.trim()) {
      setCurrentResponse('');
      streamingResponseRef.current = '';
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
    setCurrentResponse('');
    streamingResponseRef.current = '';
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !projectId) {
      message.warning('请输入问题内容');
      return;
    }

    if (isStreaming) {
      message.warning('AI 正在回答中，请稍候...');
      return;
    }

    const prompt = inputValue.trim();
    const controller = new AbortController();

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    abortControllerRef.current = controller;
    streamingResponseRef.current = '';
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    setCurrentResponse('');

    const callbacks: StreamCallbacks = {
      onToken: (token) => {
        streamingResponseRef.current += token;
        setCurrentResponse((prev) => prev + token);
      },
      onComplete: () => {
        setIsStreaming(false);
        abortControllerRef.current = null;
        appendStreamingResponse();
      },
      onError: (error) => {
        setIsStreaming(false);
        abortControllerRef.current = null;
        appendStreamingResponse();
        message.error(`AI 对话失败：${error.message}`);
      },
    };

    const context: ChatContextType = {
      type: contextMode,
      project_id: projectId,
      chapter_id: chapterId,
    };

    try {
      await chatStream(prompt, callbacks, context, controller.signal);
    } catch (error: unknown) {
      setIsStreaming(false);
      abortControllerRef.current = null;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error(`发送失败：${errorMessage}`);
    }
  };

  // 停止生成
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      appendStreamingResponse();
      message.info('生成已停止');
    }
  };

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          <span>AI 对话助手</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="ai-chat-modal"
    >
      <div className="ai-chat-container">
        {/* 对话模式选择 */}
        <div className="chat-mode-selector">
          <Select
            value={contextMode}
            onChange={(value) => setContextMode(value)}
            options={Object.entries(contextModeLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            style={{ width: '100%' }}
            disabled={isStreaming}
          />
        </div>

        {/* 对话历史 */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <RobotOutlined className="welcome-icon" />
              <Title level={5}>你好！我是你的 AI 创作助手</Title>
              <Text className="welcome-text">
                我可以帮你解答创作问题、提供灵感、检查设定一致性等。
                <br />
                请选择对话模式并开始提问吧！
              </Text>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* 当前响应（流式） */}
          {isStreaming && currentResponse && (
            <div className="chat-message message-assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-text">{currentResponse}</div>
              </div>
            </div>
          )}

          {/* 加载中状态 */}
          {isStreaming && !currentResponse && (
            <div className="chat-message message-assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <Spin size="small" />
                <Text className="loading-text">AI 思考中...</Text>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="chat-input-area">
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... (按 Enter 发送，Shift+Enter 换行)"
            rows={3}
            disabled={isStreaming}
            className="chat-input"
          />
          <Space className="chat-actions" style={{ width: '100%' }}>
            <Button
              icon={<DeleteOutlined />}
              onClick={handleClearHistory}
              disabled={isStreaming || messages.length === 0}
              size="small"
            >
              清空
            </Button>
            {isStreaming ? (
              <Button
                type="primary"
                danger
                icon={<StopOutlined />}
                onClick={handleStopGeneration}
                size="small"
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !projectId}
                size="small"
              >
                发送
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
}
