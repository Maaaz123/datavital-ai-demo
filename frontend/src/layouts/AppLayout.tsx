import { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Link,
  Menu,
  MenuItem,
  Tooltip,
  Collapse,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import HotelOutlinedIcon from '@mui/icons-material/HotelOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined';
import HealingOutlinedIcon from '@mui/icons-material/HealingOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import MedicationLiquidOutlinedIcon from '@mui/icons-material/MedicationLiquidOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import GlobalFilters from '@/components/filters/GlobalFilters';
import GlobalContextBar from '@/components/shell/GlobalContextBar';
import AnimatedPage from '@/components/motion/AnimatedPage';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useFilterStore } from '@/store/filterStore';
import { logout as apiLogout } from '@/api/auth';
import { setDocumentDirection, type SupportedLanguage } from '@/i18n';
import { brand } from '@/design-system/colors';
import { buildAppBreadcrumbs } from '@/utils/appBreadcrumbs';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

const touchTargetSx = { minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN };
const listItemTouchSx = { minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN };

interface NavItem {
  key: string;
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  /** dashboard.* / patient.* permission required to see this item. Superusers always see everything. */
  permission?: string;
  disabled?: boolean;
  disabledReasonKey?: string;
  /** Optional integration feature gate (disabled state only; visibility stays permission-based). */
  featureCode?: string;
}

interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    key: 'overview',
    labelKey: 'nav.overview',
    items: [
      { key: 'dashboard', labelKey: 'nav.dashboard', path: '/dashboard', icon: <DashboardOutlinedIcon />, permission: 'dashboard.executive' },
    ],
  },
  {
    key: 'operations',
    labelKey: 'nav.hospitalOperations',
    items: [
      { key: 'emergency', labelKey: 'nav.emergency', path: '/emergency', icon: <LocalHospitalOutlinedIcon />, permission: 'dashboard.emergency' },
      { key: 'appointments', labelKey: 'nav.appointments', path: '/appointments', icon: <EventOutlinedIcon />, permission: 'dashboard.appointments' },
      { key: 'beds', labelKey: 'nav.beds', path: '/beds', icon: <HotelOutlinedIcon />, permission: 'dashboard.beds' },
      { key: 'laboratory', labelKey: 'nav.laboratory', path: '/laboratory', icon: <ScienceOutlinedIcon />, permission: 'dashboard.laboratory' },
      { key: 'radiology', labelKey: 'nav.radiology', path: '/radiology', icon: <BiotechOutlinedIcon />, permission: 'dashboard.radiology' },
      { key: 'surgery', labelKey: 'nav.surgery', path: '/surgery', icon: <HealingOutlinedIcon />, permission: 'dashboard.surgery' },
      { key: 'pharmacy', labelKey: 'nav.pharmacy', path: '/pharmacy', icon: <MedicationOutlinedIcon />, permission: 'dashboard.pharmacy' },
      { key: 'clinicalMedication', labelKey: 'nav.clinicalMedication', path: '/clinical-ai/medication-safety', icon: <MedicationLiquidOutlinedIcon />, permission: 'dashboard.pharmacy' },
      { key: 'workforce', labelKey: 'nav.workforce', path: '/workforce', icon: <PeopleOutlinedIcon />, permission: 'dashboard.executive' },
    ],
  },
  {
    key: 'financial',
    labelKey: 'nav.financialPerformance',
    items: [{ key: 'rcm', labelKey: 'nav.rcm', path: '/rcm', icon: <AttachMoneyOutlinedIcon />, permission: 'dashboard.rcm' }],
  },
  {
    key: 'dataAi',
    labelKey: 'nav.dataAndAi',
    items: [
      { key: 'dataQuality', labelKey: 'nav.dataQualityOps', path: '/data-quality', icon: <VerifiedOutlinedIcon />, permission: 'dashboard.data_quality' },
      { key: 'pipelines', labelKey: 'nav.dataPipelines', path: '/pipelines', icon: <TimelineOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'orchestration', labelKey: 'nav.orchestration', path: '/orchestration', icon: <AccountTreeOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'alerts', labelKey: 'nav.alerts', path: '/alerts', icon: <WarningAmberOutlinedIcon />, permission: 'dashboard.alerts' },
      { key: 'aiInsights', labelKey: 'nav.aiInsights', path: '/ai/insights', icon: <InsightsOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'copilot', labelKey: 'nav.copilot', path: '/copilot', icon: <SmartToyOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'demo', labelKey: 'nav.demo', path: '/demo', icon: <AutoStoriesOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'aiBeds', labelKey: 'nav.aiBeds', path: '/ai/bed-forecast', icon: <PsychologyOutlinedIcon />, permission: 'dashboard.beds', featureCode: 'ai.beds' },
      { key: 'aiEd', labelKey: 'nav.aiEd', path: '/ai/emergency-intelligence', icon: <TimelineOutlinedIcon />, permission: 'dashboard.emergency', featureCode: 'ai.emergency' },
      { key: 'aiAppt', labelKey: 'nav.aiAppt', path: '/ai/appointment-optimizer', icon: <EventAvailableOutlinedIcon />, permission: 'dashboard.appointments' },
      { key: 'aiClaim', labelKey: 'nav.aiClaim', path: '/ai/claim-prevention', icon: <GavelOutlinedIcon />, permission: 'dashboard.rcm' },
      { key: 'aiDq', labelKey: 'nav.aiDq', path: '/ai/data-quality-agent', icon: <BugReportOutlinedIcon />, permission: 'dashboard.data_quality' },
    ],
  },
  {
    key: 'platform',
    labelKey: 'nav.platform',
    items: [
      { key: 'future', labelKey: 'nav.futureCapabilities', path: '/future', icon: <MenuBookOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'inpatient', labelKey: 'nav.inpatient', path: '/inpatient', icon: <HotelOutlinedIcon />, permission: 'dashboard.inpatient' },
      { key: 'outpatient', labelKey: 'nav.outpatient', path: '/outpatient', icon: <PeopleOutlinedIcon />, permission: 'dashboard.outpatient' },
      { key: 'diagnoses', labelKey: 'nav.diagnoses', path: '/diagnoses', icon: <AssignmentOutlinedIcon />, permission: 'dashboard.diagnoses' },
      { key: 'patients', labelKey: 'nav.patients', path: '/patients', icon: <PeopleOutlinedIcon />, permission: 'patient.view' },
      { key: 'clinicalDeterioration', labelKey: 'nav.clinicalDeterioration', path: '/clinical-ai/deterioration', icon: <MonitorHeartOutlinedIcon />, permission: 'dashboard.inpatient', featureCode: 'clinical_ai.deterioration' },
      { key: 'clinicalDiagnosis', labelKey: 'nav.clinicalDiagnosis', path: '/clinical-ai/diagnosis-support', icon: <AssignmentOutlinedIcon />, permission: 'dashboard.diagnoses' },
      { key: 'clinicalImaging', labelKey: 'nav.clinicalImaging', path: '/clinical-ai/imaging', icon: <BiotechOutlinedIcon />, permission: 'dashboard.radiology', featureCode: 'clinical_ai.imaging' },
      { key: 'clinicalOutcomes', labelKey: 'nav.clinicalOutcomes', path: '/clinical-ai/outcome-risk', icon: <AnalyticsOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'clinicalGovernance', labelKey: 'nav.clinicalGovernance', path: '/clinical-ai/governance', icon: <GavelOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'clinicalMonitoring', labelKey: 'nav.clinicalMonitoring', path: '/clinical-ai/model-monitoring', icon: <InsightsOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'dataPlatform', labelKey: 'nav.dataPlatform', path: '/integration/data-platform', icon: <HubOutlinedIcon />, permission: 'dashboard.executive' },
      { key: 'commandCenter', labelKey: 'nav.commandCenter', path: '/command-center', icon: <HubOutlinedIcon />, permission: 'dashboard.executive' },
    ],
  },
];

const routeLabels: Record<string, string> = {
  dashboard: 'nav.dashboard',
  'command-center': 'nav.commandCenter',
  demo: 'nav.demo',
  copilot: 'nav.copilot',
  beds: 'nav.beds',
  emergency: 'nav.emergency',
  inpatient: 'nav.inpatient',
  outpatient: 'nav.outpatient',
  laboratory: 'nav.laboratory',
  radiology: 'nav.radiology',
  pharmacy: 'nav.pharmacy',
  surgery: 'nav.surgery',
  rcm: 'nav.rcm',
  appointments: 'nav.appointments',
  workforce: 'nav.workforce',
  employees: 'nav.workforceEmployee',
  diagnoses: 'nav.diagnoses',
  patients: 'nav.patients',
  alerts: 'nav.alerts',
  ai: 'nav.ai',
  'bed-forecast': 'nav.aiBeds',
  'emergency-intelligence': 'nav.aiEd',
  'appointment-optimizer': 'nav.aiAppt',
  'claim-prevention': 'nav.aiClaim',
  'data-quality-agent': 'nav.aiDq',
  'data-quality': 'nav.dataQualityOps',
  pipelines: 'nav.dataPipelines',
  orchestration: 'nav.orchestration',
  insights: 'nav.aiInsights',
  future: 'nav.futureCapabilities',
  'clinical-ai': 'nav.clinicalAi',
  deterioration: 'nav.clinicalDeterioration',
  'diagnosis-support': 'nav.clinicalDiagnosis',
  imaging: 'nav.clinicalImaging',
  'medication-safety': 'nav.clinicalMedication',
  'outcome-risk': 'nav.clinicalOutcomes',
  governance: 'nav.clinicalGovernance',
  'model-monitoring': 'nav.clinicalMonitoring',
  integration: 'nav.integration',
  'data-platform': 'nav.dataPlatform',
  data: 'nav.dataAndIntegration',
  catalog: 'nav.omCatalog',
  lineage: 'nav.omLineage',
  quality: 'nav.omQuality',
  asset: 'nav.omAsset',
};

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { isMobile, isTouch } = useResponsiveLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const { mode, toggleMode } = useThemeStore();
  const { lastRefreshAt, markRefreshed, syncFromUrl } = useFilterStore();

  const { isEnabled, disabledReason: featureDisabledReason } = useFeatureGating();

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    operations: true,
    financial: true,
    dataAi: true,
    platform: false,
  });
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  useEffect(() => {
    syncFromUrl(searchParams.toString() ? `?${searchParams.toString()}` : '');
    // Ensure year is present in the URL for shell-wide persistence.
    const { filters, syncToUrl } = useFilterStore.getState();
    if (filters.year != null && !searchParams.get('year')) {
      syncToUrl();
    }
  }, [searchParams, syncFromUrl]);

  const canView = (item: NavItem) => {
    if (!item.permission) return true;
    if (!user) return true;
    if (user.is_superuser) return true;
    return user.permissions?.includes(item.permission) ?? false;
  };

  const visibleNavGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({ ...group, items: group.items.filter(canView) }))
        .filter((group) => group.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const breadcrumbs = useMemo(
    () => buildAppBreadcrumbs(location.pathname, t, routeLabels),
    [location.pathname, t],
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    markRefreshed();
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) await apiLogout(refreshToken);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const changeLanguage = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    setDocumentDirection(lang);
    setLangAnchor(null);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((g) => ({ ...g, [key]: !g[key] }));
  };

  const pageTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : t('app.title');
  const drawerAnchor = i18n.dir() === 'rtl' ? 'right' : 'left';
  const navTouchSx = isMobile || isTouch ? listItemTouchSx : { minHeight: 40 };

  const getItemDisabledState = (item: NavItem) => {
    const featureDisabled = item.featureCode ? !isEnabled(item.featureCode) : false;
    const isDisabled = item.disabled || featureDisabled;
    const reasonFromKey = item.disabledReasonKey ? t(item.disabledReasonKey) : null;
    const reasonFromFeature =
      featureDisabled && item.featureCode ? featureDisabledReason(item.featureCode) : null;
    const disabledTooltip = reasonFromKey ?? reasonFromFeature ?? null;
    return { isDisabled, disabledTooltip };
  };

  const renderNavItem = (item: NavItem) => {
    const selected = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    const { isDisabled, disabledTooltip } = getItemDisabledState(item);
    const needsTooltip = collapsed || Boolean(disabledTooltip);
    const tooltipTitle = isDisabled && disabledTooltip ? disabledTooltip : t(item.labelKey);

    const button = (
      <ListItemButton
        component={isDisabled ? 'div' : RouterLink}
        to={isDisabled ? undefined : item.path}
        disabled={isDisabled}
        selected={selected}
        sx={{
          mx: 1,
          borderRadius: 1,
          mb: 0.25,
          ...navTouchSx,
          justifyContent: collapsed ? 'center' : 'flex-start',
          '&.Mui-selected': {
            bgcolor: brand.activeBg,
            borderLeft: `2px solid ${brand.activeAccent}`,
            color: brand.sidebarText,
            '&:hover': { bgcolor: 'rgba(44, 193, 224, 0.2)' },
          },
          color: brand.sidebarMuted,
          '&:hover': { bgcolor: 'rgba(220, 233, 243, 0.06)' },
        }}
      >
        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: selected ? brand.activeAccent : 'inherit', justifyContent: 'center' }}>
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={t(item.labelKey)}
            primaryTypographyProps={{ variant: 'body2', fontWeight: selected ? 650 : 500, color: selected ? brand.sidebarText : brand.sidebarMuted }}
          />
        )}
      </ListItemButton>
    );

    if (!needsTooltip) {
      return <Box key={item.key}>{button}</Box>;
    }

    return (
      <Tooltip key={item.key} title={tooltipTitle} placement="right">
        <Box component="span" sx={{ display: 'block' }}>
          {button}
        </Box>
      </Tooltip>
    );
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: brand.sidebar, color: brand.sidebarText }}>
      <Box
        sx={{
          px: collapsed ? 1 : 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 72,
        }}
      >
        <LocalHospitalOutlinedIcon sx={{ color: brand.activeAccent, fontSize: 28 }} />
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2} noWrap sx={{ color: brand.sidebarText }}>
              {t('app.title')}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.sidebarMuted, display: 'block' }} noWrap>
              {t('app.byNextGn', { defaultValue: 'by NextGn Labs' })}
            </Typography>
          </Box>
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(220,233,243,0.08)' }} />
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {visibleNavGroups.map((group) => (
          <Box key={group.key}>
            {!collapsed && (
              <ListItemButton onClick={() => toggleGroup(group.key)} sx={{ py: 0.5, ...navTouchSx }}>
                <ListItemText
                  primary={t(group.labelKey)}
                  primaryTypographyProps={{
                    variant: 'caption',
                    fontWeight: 650,
                    sx: { color: brand.sidebarMuted, letterSpacing: '0.02em' },
                  }}
                />
                {openGroups[group.key] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </ListItemButton>
            )}
            <Collapse in={collapsed || openGroups[group.key]} timeout={220}>
              <List dense disablePadding>
                {group.items.map((item) => renderNavItem(item))}
              </List>
            </Collapse>
          </Box>
        ))}
      </Box>
      <Box sx={{ borderTop: '1px solid rgba(220,233,243,0.08)', p: 1.5 }}>
        {!collapsed && user ? (
          <Box sx={{ px: 1, mb: 1 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ color: brand.sidebarText }}>
              {user.full_name}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: brand.sidebarMuted, display: 'block' }}>
              {user.email}
            </Typography>
          </Box>
        ) : null}
        {!isMobile && (
          <IconButton
            onClick={() => setCollapsed((c) => !c)}
            sx={{ color: brand.sidebarMuted, width: '100%', ...touchTargetSx }}
            aria-label={collapsed ? t('responsive.menu') : t('responsive.close')}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { md: drawerOpen ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], { duration: theme.transitions.duration.standard }),
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 52, sm: 56 }, bgcolor: brand.surface, borderBottom: `1px solid ${brand.border}` }}>
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label={t('responsive.menu')}
            sx={{
              display: { xs: 'inline-flex', md: drawerOpen ? 'none' : 'inline-flex' },
              ...touchTargetSx,
            }}
          >
            <MenuIcon />
          </IconButton>

          {breadcrumbs.length > 1 ? (
            <Breadcrumbs
              aria-label={t('app.breadcrumb', { defaultValue: 'Breadcrumb' })}
              sx={{
                flex: 1,
                minWidth: 0,
                color: brand.deepNavy,
                '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap', rowGap: 0.25 },
                '& .MuiTypography-root, & a': {
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                },
              }}
            >
              {breadcrumbs.map((crumb) =>
                crumb.last ? (
                  <Typography
                    key={crumb.path}
                    variant="subtitle1"
                    fontWeight={650}
                    color={brand.deepNavy}
                    noWrap
                    aria-current="page"
                  >
                    {crumb.label}
                  </Typography>
                ) : (
                  <Link
                    key={crumb.path}
                    component={RouterLink}
                    to={crumb.path}
                    underline="hover"
                    color="inherit"
                    variant="subtitle1"
                    fontWeight={600}
                    noWrap
                    sx={{ maxWidth: { xs: 140, sm: 220 } }}
                  >
                    {crumb.label}
                  </Link>
                ),
              )}
            </Breadcrumbs>
          ) : (
            <Typography
              variant="subtitle1"
              fontWeight={650}
              noWrap
              sx={{ flex: 1, color: brand.deepNavy, minWidth: 0 }}
            >
              {pageTitle}
            </Typography>
          )}

          <Tooltip title={t('app.refresh')}>
            <IconButton onClick={handleRefresh} color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' }, ...touchTargetSx }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {lastRefreshAt && (
            <Typography variant="caption" sx={{ display: { xs: 'none', lg: 'block' }, color: brand.textMuted }}>
              {t('app.lastRefresh')}: {dayjs(lastRefreshAt).format('HH:mm:ss')}
            </Typography>
          )}

          <Tooltip title={mode === 'light' ? t('app.darkMode') : t('app.lightMode')}>
            <IconButton
              onClick={toggleMode}
              color="inherit"
              sx={{ display: { xs: 'none', md: 'inline-flex' }, ...touchTargetSx }}
            >
              {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={t('app.language')}>
            <IconButton
              onClick={(e) => setLangAnchor(e.currentTarget)}
              color="inherit"
              sx={{ display: { xs: 'none', md: 'inline-flex' }, ...touchTargetSx }}
            >
              <LanguageIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)}>
            <MenuItem selected={i18n.language === 'en'} onClick={() => changeLanguage('en')}>
              English
            </MenuItem>
            <MenuItem selected={i18n.language === 'ar'} onClick={() => changeLanguage('ar')}>
              العربية
            </MenuItem>
          </Menu>

          <Tooltip title={t('nav.alerts')}>
            <IconButton color="inherit" sx={touchTargetSx} onClick={() => navigate('/alerts')} aria-label={t('nav.alerts')}>
              <NotificationsOutlinedIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.full_name ?? t('app.profile')}>
            <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} color="inherit" sx={touchTargetSx}>
              <AccountCircleIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={() => setUserAnchor(null)}>
            {user && (
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user.full_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            )}
            <Divider />
            {isMobile && (
              <>
                <MenuItem
                  onClick={() => {
                    toggleMode();
                    setUserAnchor(null);
                  }}
                >
                  {mode === 'light' ? t('app.darkMode') : t('app.lightMode')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    changeLanguage(i18n.language === 'en' ? 'ar' : 'en');
                    setUserAnchor(null);
                  }}
                >
                  {t('app.language')}: {i18n.language === 'en' ? 'العربية' : 'English'}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleRefresh();
                    setUserAnchor(null);
                  }}
                >
                  {t('app.refresh')}
                </MenuItem>
                <Divider />
              </>
            )}
            <MenuItem onClick={handleLogout}>{t('app.logout')}</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor={drawerAnchor}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width'),
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          transition: theme.transitions.create(['width', 'margin'], { duration: theme.transitions.duration.standard }),
        }}
      >
        <Toolbar />
        <GlobalContextBar />
        <GlobalFilters />
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            pb: 'max(12px, env(safe-area-inset-bottom))',
            bgcolor: 'background.default',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflowX: 'hidden',
          }}
        >
          <Box
            role="note"
            sx={{
              mb: 2,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.main',
              color: 'text.primary',
              fontSize: 13,
              fontWeight: 650,
            }}
          >
            DataVital AI demonstration. Synthetic data only — not a live hospital system.
          </Box>
          <AnimatedPage>
            <Outlet />
          </AnimatedPage>
        </Box>
      </Box>
    </Box>
  );
}
