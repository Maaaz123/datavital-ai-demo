import { Navigate, useParams } from 'react-router-dom';
import CoreApp from '@/core/CoreApp';
import {
  Architecture,
  AreaPage,
  Challenge,
  ExperiencePage,
  ExplorerPage,
  IntelligencePage,
  LibraryPage,
  LifecyclePage,
  OperationsHub,
  Overview,
  PlatformPage,
  PresentPage,
  SettingsPage,
  Solution,
  StoryPage,
} from '@/core/pages';

function ToStory() {
  const { screenId = 'command' } = useParams();
  return <Navigate to={`/story/${screenId}`} replace />;
}

function ToKpi() {
  const { metricKey = 'kpi_bed_occupancy_rate' } = useParams();
  return <Navigate to={`/kpis/${metricKey}`} replace />;
}

const LEGACY: Record<string, string> = {
  '/login': '/',
  '/dashboard': '/operations/executive',
  '/command-center': '/story/command',
  '/demo': '/present',
  '/copilot': '/intelligence',
  '/beds': '/story/beds',
  '/emergency': '/story/emergency',
  '/inpatient': '/story/inpatient',
  '/outpatient': '/story/outpatient',
  '/laboratory': '/story/laboratory',
  '/radiology': '/story/radiology',
  '/pharmacy': '/story/pharmacy',
  '/surgery': '/story/surgery',
  '/rcm': '/story/rcm',
  '/appointments': '/story/appointments',
  '/workforce': '/story/workforce',
  '/workforce/employees/:id': '/story/workforce',
  '/diagnoses': '/story/diagnoses',
  '/patients': '/story/registry',
  '/patients/:patientId': '/story/registry',
  '/alerts': '/story/risk',
  '/ai/bed-forecast': '/story/predictions',
  '/ai/emergency-intelligence': '/story/emergency',
  '/ai/appointment-optimizer': '/story/appointments',
  '/ai/claim-prevention': '/story/claims',
  '/ai/data-quality-agent': '/story/quality',
  '/data-quality': '/story/quality',
  '/clinical-ai/deterioration': '/story/mortality',
  '/clinical-ai/diagnosis-support': '/story/diagnoses',
  '/clinical-ai/imaging': '/story/radiology',
  '/clinical-ai/medication-safety': '/story/pharmacy',
  '/clinical-ai/outcome-risk': '/story/mortality',
  '/clinical-ai/governance': '/story/ai-governance',
  '/clinical-ai/model-monitoring': '/story/ai-governance',
  '/integration/data-platform': '/story/metadata',
  '/pipelines': '/story/verified-queries',
  '/orchestration': '/architecture',
  '/ai/insights': '/story/insights',
  '/future': '/solution',
  '/data/catalog': '/kpis',
  '/data/lineage': '/architecture',
  '/data/quality': '/story/quality',
  '/data/asset': '/story/metadata',
  '/showcase': '/',
  '/showcase/tour': '/present',
  '/showcase/experience': '/experience',
  '/showcase/compare': '/story/comparison',
  '/showcase/catalog': '/kpis',
  '/showcase/assistant': '/intelligence',
  '/showcase/coverage': '/library',
};

export const routes = [
  {
    path: '/',
    element: <CoreApp />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'platform', element: <PlatformPage /> },
      { path: 'challenge', element: <Challenge /> },
      { path: 'solution', element: <Solution /> },
      { path: 'architecture', element: <Architecture /> },
      { path: 'operations', element: <OperationsHub /> },
      { path: 'operations/:area', element: <AreaPage /> },
      { path: 'story/:screenId', element: <StoryPage /> },
      { path: 'experience', element: <ExperiencePage /> },
      { path: 'intelligence', element: <IntelligencePage /> },
      { path: 'kpis', element: <ExplorerPage /> },
      { path: 'kpis/:metricKey', element: <LifecyclePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'present', element: <PresentPage /> },
    ],
  },
  ...Object.entries(LEGACY).map(([path, to]) => ({ path, element: <Navigate to={to} replace /> })),
  { path: '/showcase/screens/:screenId', element: <ToStory /> },
  { path: '/showcase/extensions/:screenId', element: <ToStory /> },
  { path: '/showcase/kpis/:metricKey', element: <ToKpi /> },
  { path: '/showcase/*', element: <Navigate to="/" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
