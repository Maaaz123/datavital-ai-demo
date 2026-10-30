import { Navigate } from 'react-router-dom';
import CoreApp from '@/core/CoreApp';
import { BedsCapacityPage, BedsOverviewPage, BedsPlacementPage } from '@/core/beds';
import { FlowPage, OverviewPage, QualityPage } from '@/core/four';
import { IpdOutcomesPage, IpdSnapshotPage, IpdStayPage } from '@/core/ipd';
import { OpdFlowPage, OpdOverviewPage, OpdQualityPage } from '@/core/opd';
import { ApptAccessPage, ApptAttendancePage, ApptCommandPage, ApptRecoveryPage } from '@/core/appointments';
import { SurgAccessPage, SurgCommandPage, SurgOptimizationPage, SurgOrPage, SurgQualityPage } from '@/core/surgery';
import { RadAccessPage, RadCommandPage, RadOptimizationPage, RadQualityPage, RadUtilizationPage } from '@/core/radiology';
import { PharmCommandPage, PharmCostPage, PharmDispensingPage, PharmInventoryPage, PharmOptimizationPage, PharmSafetyPage } from '@/core/pharmacy';
import { LabAnalyzersPage, LabCommandPage, LabOptimizationPage, LabQualityPage, LabSamplesPage } from '@/core/laboratory';
import { IcuCapacityPage, IcuCommandPage, IcuEquipmentPage, IcuFlowPage, IcuOptimizationPage, IcuQualityPage } from '@/core/icu';
import { PxCommandPage, PxComplaintsPage, PxDepartmentsPage, PxJourneyPage, PxOptimizationPage, PxVoicePage } from '@/core/patientExperience';
import {
  RcmBillingPage,
  RcmClaimsPage,
  RcmCollectionsPage,
  RcmCommandPage,
  RcmEligibilityPage,
  RcmLeakagePage,
  RcmOptimizationPage,
} from '@/core/rcm';

const LEGACY = [
  '/login', '/dashboard', '/command-center', '/demo', '/copilot',
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
      { path: 'surgery', element: <SurgCommandPage /> },
      { path: 'surgery/or', element: <SurgOrPage /> },
      { path: 'surgery/access', element: <SurgAccessPage /> },
      { path: 'surgery/quality', element: <SurgQualityPage /> },
      { path: 'surgery/optimization', element: <SurgOptimizationPage /> },
      { path: 'radiology', element: <RadCommandPage /> },
      { path: 'radiology/access', element: <RadAccessPage /> },
      { path: 'radiology/utilization', element: <RadUtilizationPage /> },
      { path: 'radiology/quality', element: <RadQualityPage /> },
      { path: 'radiology/optimization', element: <RadOptimizationPage /> },
      { path: 'laboratory', element: <LabCommandPage /> },
      { path: 'laboratory/samples', element: <LabSamplesPage /> },
      { path: 'laboratory/analyzers', element: <LabAnalyzersPage /> },
      { path: 'laboratory/quality', element: <LabQualityPage /> },
      { path: 'laboratory/optimization', element: <LabOptimizationPage /> },
      { path: 'pharmacy', element: <PharmCommandPage /> },
      { path: 'pharmacy/dispensing', element: <PharmDispensingPage /> },
      { path: 'pharmacy/inventory', element: <PharmInventoryPage /> },
      { path: 'pharmacy/safety', element: <PharmSafetyPage /> },
      { path: 'pharmacy/cost', element: <PharmCostPage /> },
      { path: 'pharmacy/optimization', element: <PharmOptimizationPage /> },
      { path: 'icu', element: <IcuCommandPage /> },
      { path: 'icu/flow', element: <IcuFlowPage /> },
      { path: 'icu/capacity', element: <IcuCapacityPage /> },
      { path: 'icu/equipment', element: <IcuEquipmentPage /> },
      { path: 'icu/quality', element: <IcuQualityPage /> },
      { path: 'icu/optimization', element: <IcuOptimizationPage /> },
      { path: 'patient-experience', element: <PxCommandPage /> },
      { path: 'patient-experience/journey', element: <PxJourneyPage /> },
      { path: 'patient-experience/complaints', element: <PxComplaintsPage /> },
      { path: 'patient-experience/voice', element: <PxVoicePage /> },
      { path: 'patient-experience/departments', element: <PxDepartmentsPage /> },
      { path: 'patient-experience/optimization', element: <PxOptimizationPage /> },
      { path: 'rcm', element: <RcmCommandPage /> },
      { path: 'rcm/eligibility', element: <RcmEligibilityPage /> },
      { path: 'rcm/billing', element: <RcmBillingPage /> },
      { path: 'rcm/claims', element: <RcmClaimsPage /> },
      { path: 'rcm/collections', element: <RcmCollectionsPage /> },
      { path: 'rcm/leakage', element: <RcmLeakagePage /> },
      { path: 'rcm/optimization', element: <RcmOptimizationPage /> },
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
