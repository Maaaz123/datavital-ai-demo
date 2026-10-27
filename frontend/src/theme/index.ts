import { createTheme, type Theme } from '@mui/material/styles';
import type { ThemeMode } from '@/store/themeStore';
import { brand, semantic } from '@/design-system/colors';
import { chartPalette, chartSeriesColors } from '@/design-system/chartTheme';
import { muiBreakpoints, TOUCH_TARGET_MIN } from '@/design-system/breakpoints';

declare module '@mui/material/styles' {
  interface Palette {
    healthy: Palette['primary'];
    warning: Palette['primary'];
    critical: Palette['primary'];
    info: Palette['primary'];
    inactive: Palette['primary'];
  }
  interface PaletteOptions {
    healthy?: PaletteOptions['primary'];
    warning?: PaletteOptions['primary'];
    critical?: PaletteOptions['primary'];
    info?: PaletteOptions['primary'];
    inactive?: PaletteOptions['primary'];
  }
}

const fontFamily = '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function createAppTheme(mode: ThemeMode): Theme {
  const isDark = mode === 'dark';

  return createTheme({
    breakpoints: { values: muiBreakpoints },
    palette: {
      mode,
      primary: {
        main: isDark ? brand.cyan : brand.primaryBlue,
        light: brand.cyan,
        dark: brand.deepNavy,
        contrastText: '#ffffff',
      },
      secondary: {
        main: isDark ? brand.sidebarMuted : brand.textSecondary,
      },
      background: {
        default: isDark ? brand.sidebar : brand.appBg,
        paper: isDark ? brand.sidebarElevated : brand.surface,
      },
      text: {
        primary: isDark ? brand.sidebarText : brand.textPrimary,
        secondary: isDark ? brand.sidebarMuted : brand.textSecondary,
      },
      divider: isDark ? 'rgba(148,180,204,0.18)' : brand.border,
      success: { main: semantic.healthy },
      warning: { main: semantic.warning },
      error: { main: semantic.critical },
      info: { main: semantic.info },
      healthy: { main: semantic.healthy },
      critical: { main: semantic.critical },
      inactive: { main: semantic.inactive },
    },
    typography: {
      fontFamily,
      h4: { fontWeight: 700, letterSpacing: '-0.02em', color: isDark ? undefined : brand.deepNavy },
      h5: { fontWeight: 700, letterSpacing: '-0.015em' },
      h6: { fontWeight: 650 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: 'var(--hap-bg-default)', fontFamily },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 36,
            borderRadius: 10,
            '@media (pointer: coarse)': { minHeight: TOUCH_TARGET_MIN },
          },
          containedPrimary: {
            boxShadow: brand.shadowSoft,
            '&:hover': { boxShadow: brand.shadowCard },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: 36,
            minHeight: 36,
            '@media (pointer: coarse)': {
              minWidth: TOUCH_TARGET_MIN,
              minHeight: TOUCH_TARGET_MIN,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${isDark ? 'rgba(148,180,204,0.18)' : brand.border}`,
            borderRadius: 14,
            backgroundImage: 'none',
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: { padding: '16px 20px 8px' },
          title: { fontSize: '0.9375rem', fontWeight: 650 },
          subheader: { fontSize: '0.8125rem', color: brand.textMuted },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            '&:last-child': { paddingBottom: 20 },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: brand.sidebar,
            color: brand.sidebarText,
            borderRight: 'none',
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: brand.surface,
            color: brand.textPrimary,
            boxShadow: 'none',
            borderBottom: `1px solid ${brand.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: brand.surface,
            border: `1px solid ${brand.border}`,
            color: brand.textPrimary,
            fontSize: '0.75rem',
            boxShadow: brand.shadowCard,
          },
        },
      },
    },
  });
}

export const bedStatusColors: Record<string, string> = {
  available: semantic.healthy,
  occupied: semantic.info,
  cleaning: semantic.warning,
  blocked: semantic.critical,
  reserved: brand.teal,
  maintenance: semantic.inactive,
};

export const chartColors = [...chartPalette];
export { chartSeriesColors, brand };
