import { Navigate } from 'react-router-dom';
import CoreApp from '@/core/CoreApp';
import { BedsCapacityPage, BedsOverviewPage, BedsPlacementPage } from '@/core/beds';

const LEGACY = [
  '/login', '/dashboard', '/command-center', '/demo', '/copilot', '/emergency',
  '/inpatient', '/outpatient', '/laboratory', '/radiology', '/pharmacy', '/surgery', '/rcm',
  '/appointments', '/workforce', '/diagnoses', '/patients', '/alerts', '/settings',
  '/ai/bed-forecast', '/ai/emergency-intelligence', '/ai/appointment-optimizer', '/ai/claim-prevention',
  '/ai/data-quality-agent', '/ai/insights', '/data-quality', '/pipelines', '/orchestration', '/future',
  '/data/catalog', '/data/lineage', '/data/quality', '/data/asset', '/showcase', '/platform',
  '/challenge', '/solution', '/architecture', '/operations', '/experience', '/intelligence',
  '/kpis', '/library', '/present', '/story/emergency', '/story/beds',
  '/emergency/flow', '/emergency/quality', '/emergency/ai', '/emergency/capacity-quality', '/emergency/ai-decisions',
];

export const routes = [
  {
    path: '/',
    element: <CoreApp />,
    children: [
      { index: true, element: <BedsOverviewPage /> },
      { path: 'beds/placement', element: <BedsPlacementPage /> },
      { path: 'beds/capacity', element: <BedsCapacityPage /> },
      { path: 'beds', element: <Navigate to="/" replace /> },
    ],
  },
  ...LEGACY.map((path) => ({ path, element: <Navigate to="/" replace /> })),
  { path: '/workforce/employees/:id', element: <Navigate to="/" replace /> },
  { path: '/patients/:patientId', element: <Navigate to="/" replace /> },
  { path: '/operations/:area', element: <Navigate to="/" replace /> },
  { path: '/story/:screenId', element: <Navigate to="/" replace /> },
  { path: '/board/:domain/:tab', element: <Navigate to="/" replace /> },
  { path: '/kpis/:metricKey', element: <Navigate to="/" replace /> },
  { path: '/showcase/screens/:screenId', element: <Navigate to="/" replace /> },
  { path: '/showcase/extensions/:screenId', element: <Navigate to="/" replace /> },
  { path: '/showcase/kpis/:metricKey', element: <Navigate to="/" replace /> },
  { path: '/showcase/*', element: <Navigate to="/" replace /> },
  { path: '/clinical-ai/*', element: <Navigate to="/" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
