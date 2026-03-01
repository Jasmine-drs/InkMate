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
import CharacterList from '@/pages/CharacterList';
import CharacterEditor from '@/pages/CharacterEditor';
import OutlineList from '@/pages/OutlineList';
import OutlineEditor from '@/pages/OutlineEditor';
import UnitList from '@/pages/UnitList';
import UnitEditor from '@/pages/UnitEditor';
import TrackingList from '@/pages/TrackingList';

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
      {
        path: 'project/:id/characters',
        element: <CharacterList />,
      },
      {
        path: 'project/:id/character/:characterId',
        element: <CharacterEditor />,
      },
      {
        path: 'project/:id/outlines',
        element: <OutlineList />,
      },
      {
        path: 'project/:id/outline/:outlineId',
        element: <OutlineEditor />,
      },
      {
        path: 'project/:id/units',
        element: <UnitList />,
      },
      {
        path: 'project/:id/unit/:unitId',
        element: <UnitEditor />,
      },
      {
        path: 'project/:id/tracking',
        element: <TrackingList />,
      },
    ],
  },
]);
