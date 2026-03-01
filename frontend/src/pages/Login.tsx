/**
 * 登录页面 - 重构版
 * 墨蓝色渐变背景 + 玻璃态卡片
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { login, register } from '@/services/user';
import { useUserStore } from '@/store/userStore';
import './Login.css';

const { Title, Text } = Typography;

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useUserStore((state) => state.setAuth);

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      if (isLogin) {
        const response = await login({
          username: values.email,
          password: values.password,
        });
        setAuth(response.user, response.access_token);
        message.success('登录成功');
      } else {
        await register({
          username: values.username,
          email: values.email,
          password: values.password,
        });
        message.success('注册成功，请登录');
        setIsLogin(true);
        return;
      }
      navigate('/');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '操作失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* 背景装饰 */}
      <div className="login-bg-decoration">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="login-card-wrapper">
        <Card className="login-card glass">
          <div className="login-header">
            <div className="logo-wrapper">
              <BookOutlined className="logo-icon" />
            </div>
            <Title level={2} className="login-title">InkMate</Title>
            <Text className="login-subtitle">
              {isLogin ? '欢迎回来' : '创建新账号'}
            </Text>
          </div>

          <Form onFinish={onFinish} layout="vertical" size="large" className="login-form">
            {!isLogin && (
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
                label={<span className="form-label">用户名</span>}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户名"
                  className="custom-input"
                />
              </Form.Item>
            )}

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
              label={<span className="form-label">邮箱</span>}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入邮箱"
                className="custom-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 位' }
              ]}
              label={<span className="form-label">密码</span>}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                className="custom-input"
              />
            </Form.Item>

            <Form.Item className="form-actions">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="submit-btn"
              >
                {isLogin ? '登录' : '注册'}
              </Button>
            </Form.Item>

            <div className="switch-mode">
              <Text className="switch-text">
                {isLogin ? '还没有账号？' : '已有账号？'}
              </Text>
              <Button type="link" onClick={() => setIsLogin(!isLogin)} className="switch-btn">
                {isLogin ? '立即注册' : '去登录'}
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}
