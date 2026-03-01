/**
 * 路由配置
 */
import { createBrowserRouter } from 'react-router-dom';
import App from '@/App';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProjectDetail from '@/pages/ProjectDetail';
import Editor from '@/pages/Editor';
import SettingsEditor from '@/pages/SettingsEditor';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'project/:id',
        element: <ProjectDetail />,
      },
      {
        path: 'editor/:projectId/:chapterId',
        element: <Editor />,
      },
      {
        path: 'settings/:projectId',
        element: <SettingsEditor />,
      },
    ],
  },
]);
