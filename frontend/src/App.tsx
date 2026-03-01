import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useEffect } from 'react';
import { getCurrentUser } from '@/services/user';

function AppRoot() {
  const { isAuthenticated, user, setAuth } = useUserStore();
  const navigate = useNavigate();

  // 初始化时获取用户信息
  useEffect(() => {
    const initUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token && !user) {
        try {
          const userData = await getCurrentUser();
          setAuth(userData, token);
        } catch (error) {
          // Token 无效，清除认证状态
          localStorage.removeItem('access_token');
          navigate('/login');
        }
      }
    };
    initUser();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <App>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#F97316',
            borderRadius: 10,
            colorBgLayout: '#0A0E1A',
            colorText: '#F8FAFC',
            colorBgContainer: '#0F1425',
            colorBorder: '#1E293B',
          },
        }}
      >
        <Outlet />
      </ConfigProvider>
    </App>
  );
}

export default AppRoot;
