import { Navigate } from 'react-router-dom';
import CoreApp from '@/core/CoreApp';
import { BedsCapacityPage, BedsOverviewPage, BedsPlacementPage } from '@/core/beds';
import { FlowPage, OverviewPage, QualityPage } from '@/core/four';
import { IpdOutcomesPage, IpdSnapshotPage, IpdStayPage } from '@/core/ipd';
import { OpdFlowPage, OpdOverviewPage, OpdQualityPage } from '@/core/opd';
import { ApptAccessPage, ApptAttendancePage, ApptCommandPage, ApptRecoveryPage } from '@/core/appointments';

const LEGACY = [
  '/login', '/dashboard', '/command-center', '/demo', '/copilot',
  '/laboratory', '/radiology', '/pharmacy', '/surgery', '/rcm',
  '/workforce', '/diagnoses', '/patients', '/alerts', '/settings',
  '/ai/bed-forecast', '/ai/emergency-intelligence', '/ai/appointment-optimizer', '/ai/claim-prevention',
  '/ai/data-quality-agent', '/ai/insights', '/data-quality', '/pipelines', '/orchestration', '/future',
  '/data/catalog', '/data/lineage', '/data/quality', '/data/asset', '/showcase', '/platform',
  '/challenge', '/solution', '/architecture', '/operations', '/experience', '/intelligence',
  '/kpis', '/library', '/present', '/story/emergency', '/story/beds', '/story/inpatient',
  '/emergency/ai', '/emergency/capacity-quality', '/emergency/ai-decisions',
];

export const routes = [
  {
    path: '/',
    element: <CoreApp />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'emergency', element: <Navigate to="/" replace /> },
      { path: 'emergency/flow', element: <FlowPage /> },
      { path: 'emergency/quality', element: <QualityPage /> },
      { path: 'beds', element: <BedsOverviewPage /> },
      { path: 'beds/placement', element: <BedsPlacementPage /> },
      { path: 'beds/capacity', element: <BedsCapacityPage /> },
      { path: 'inpatient', element: <IpdSnapshotPage /> },
      { path: 'inpatient/stay', element: <IpdStayPage /> },
      { path: 'inpatient/outcomes', element: <IpdOutcomesPage /> },
      { path: 'outpatient', element: <OpdOverviewPage /> },
      { path: 'outpatient/flow', element: <OpdFlowPage /> },
      { path: 'outpatient/quality', element: <OpdQualityPage /> },
      { path: 'appointments', element: <ApptCommandPage /> },
      { path: 'appointments/access', element: <ApptAccessPage /> },
      { path: 'appointments/attendance', element: <ApptAttendancePage /> },
      { path: 'appointments/recovery', element: <ApptRecoveryPage /> },
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
