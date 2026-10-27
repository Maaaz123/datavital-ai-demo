/* eslint-disable react-refresh/only-export-components -- route element factories */
import { Navigate } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from '@/layouts/AppLayout';
import { PermissionRoute, ProtectedRoute, PublicRoute } from '@/routes/AuthGuards';

function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(loader);
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
          <CircularProgress aria-label="Loading page" />
        </Box>
      }
    >
      <Page />
    </Suspense>
  );
}

const LoginPage = () => lazyPage(() => import('@/pages/LoginPage'));
const ExecutiveDashboard = () => lazyPage(() => import('@/pages/ExecutiveDashboard'));
const CommandCenterPage = () => lazyPage(() => import('@/pages/CommandCenterPage'));
const DemoStoryPage = () => lazyPage(() => import('@/pages/DemoStoryPage'));
const CopilotPage = () => lazyPage(() => import('@/pages/CopilotPage'));
const BedsDashboard = () => lazyPage(() => import('@/pages/BedsDashboard'));
const EmergencyDashboard = () => lazyPage(() => import('@/pages/EmergencyDashboard'));
const InpatientDashboard = () => lazyPage(() => import('@/pages/InpatientDashboard'));
const OutpatientDashboard = () => lazyPage(() => import('@/pages/OutpatientDashboard'));
const LaboratoryDashboard = () => lazyPage(() => import('@/pages/LaboratoryDashboard'));
const RadiologyDashboard = () => lazyPage(() => import('@/pages/RadiologyDashboard'));
const PharmacyDashboard = () => lazyPage(() => import('@/pages/PharmacyDashboard'));
const SurgeryDashboard = () => lazyPage(() => import('@/pages/SurgeryDashboard'));
const RcmDashboard = () => lazyPage(() => import('@/pages/RcmDashboard'));
const AppointmentsDashboard = () => lazyPage(() => import('@/pages/AppointmentsDashboard'));
const DiagnosesDashboard = () => lazyPage(() => import('@/pages/DiagnosesDashboard'));
const PatientsPage = () => lazyPage(() => import('@/pages/PatientsPage'));
const Patient360Page = () => lazyPage(() => import('@/pages/Patient360Page'));
const AlertsDashboard = () => lazyPage(() => import('@/pages/AlertsDashboard'));
const AiBedForecastPage = () => lazyPage(() => import('@/pages/AiBedForecastPage'));
const AiEmergencyIntelligencePage = () => lazyPage(() => import('@/pages/AiEmergencyIntelligencePage'));
const AiAppointmentOptimizerPage = () => lazyPage(() => import('@/pages/AiAppointmentOptimizerPage'));
const AiClaimPreventionPage = () => lazyPage(() => import('@/pages/AiClaimPreventionPage'));
const AiDataQualityAgentPage = () => lazyPage(() => import('@/pages/AiDataQualityAgentPage'));
const DeteriorationPage = () => lazyPage(() => import('@/pages/clinical-ai/DeteriorationPage'));
const DiagnosisSupportPage = () => lazyPage(() => import('@/pages/clinical-ai/DiagnosisSupportPage'));
const ImagingPage = () => lazyPage(() => import('@/pages/clinical-ai/ImagingPage'));
const MedicationSafetyPage = () => lazyPage(() => import('@/pages/clinical-ai/MedicationSafetyPage'));
const OutcomeRiskPage = () => lazyPage(() => import('@/pages/clinical-ai/OutcomeRiskPage'));
const GovernancePage = () => lazyPage(() => import('@/pages/clinical-ai/GovernancePage'));
const ModelMonitoringPage = () => lazyPage(() => import('@/pages/clinical-ai/ModelMonitoringPage'));
const DataPlatformPage = () => lazyPage(() => import('@/pages/integration/DataPlatformPage'));
const DataQualityOpsPage = () => lazyPage(() => import('@/pages/DataQualityOpsPage'));
const DataPipelinesPage = () => lazyPage(() => import('@/pages/DataPipelinesPage'));
const OrchestrationPage = () => lazyPage(() => import('@/pages/OrchestrationPage'));
const AiInsightsPage = () => lazyPage(() => import('@/pages/AiInsightsPage'));
const FutureCapabilitiesPage = () => lazyPage(() => import('@/pages/FutureCapabilitiesPage'));
const WorkforceDashboard = () => lazyPage(() => import('@/pages/WorkforceDashboard'));
const WorkforceEmployeeProfilePage = () => lazyPage(() => import('@/pages/WorkforceEmployeeProfilePage'));
const OmAssetPage = () => lazyPage(() => import('@/pages/openmetadata/AssetPage'));

export const routes = [
  {
    element: <PublicRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <ExecutiveDashboard /> },
          { path: '/command-center', element: <CommandCenterPage /> },
          { path: '/demo', element: <DemoStoryPage /> },
          { path: '/copilot', element: <CopilotPage /> },
          { path: '/beds', element: <BedsDashboard /> },
          { path: '/emergency', element: <EmergencyDashboard /> },
          { path: '/inpatient', element: <InpatientDashboard /> },
          { path: '/outpatient', element: <OutpatientDashboard /> },
          { path: '/laboratory', element: <LaboratoryDashboard /> },
          { path: '/radiology', element: <RadiologyDashboard /> },
          { path: '/pharmacy', element: <PharmacyDashboard /> },
          { path: '/surgery', element: <SurgeryDashboard /> },
          { path: '/rcm', element: <RcmDashboard /> },
          { path: '/appointments', element: <AppointmentsDashboard /> },
          { path: '/workforce', element: <WorkforceDashboard /> },
          { path: '/workforce/employees/:id', element: <WorkforceEmployeeProfilePage /> },
          { path: '/diagnoses', element: <DiagnosesDashboard /> },
          {
            element: <PermissionRoute permission="patient.view" />,
            children: [
              { path: '/patients', element: <PatientsPage /> },
              { path: '/patients/:patientId', element: <Patient360Page /> },
            ],
          },
          { path: '/alerts', element: <AlertsDashboard /> },
          { path: '/ai/bed-forecast', element: <AiBedForecastPage /> },
          { path: '/ai/emergency-intelligence', element: <AiEmergencyIntelligencePage /> },
          { path: '/ai/appointment-optimizer', element: <AiAppointmentOptimizerPage /> },
          { path: '/ai/claim-prevention', element: <AiClaimPreventionPage /> },
          {
            element: <PermissionRoute permission="dashboard.data_quality" />,
            children: [
              { path: '/ai/data-quality-agent', element: <AiDataQualityAgentPage /> },
              { path: '/data-quality', element: <DataQualityOpsPage /> },
            ],
          },
          { path: '/clinical-ai/deterioration', element: <DeteriorationPage /> },
          { path: '/clinical-ai/diagnosis-support', element: <DiagnosisSupportPage /> },
          { path: '/clinical-ai/imaging', element: <ImagingPage /> },
          { path: '/clinical-ai/medication-safety', element: <MedicationSafetyPage /> },
          { path: '/clinical-ai/outcome-risk', element: <OutcomeRiskPage /> },
          { path: '/clinical-ai/governance', element: <GovernancePage /> },
          { path: '/clinical-ai/model-monitoring', element: <ModelMonitoringPage /> },
          { path: '/integration/data-platform', element: <DataPlatformPage /> },
          { path: '/pipelines', element: <DataPipelinesPage /> },
          { path: '/orchestration', element: <OrchestrationPage /> },
          { path: '/ai/insights', element: <AiInsightsPage /> },
          { path: '/future', element: <FutureCapabilitiesPage /> },
          // OpenMetadata primary pages redirected for demo; code preserved under pages/openmetadata
          { path: '/data/catalog', element: <Navigate to="/future" replace /> },
          { path: '/data/lineage', element: <Navigate to="/future" replace /> },
          { path: '/data/quality', element: <Navigate to="/data-quality" replace /> },
          { path: '/data/asset', element: <OmAssetPage /> },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
];
