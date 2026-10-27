import { useMemo } from 'react';
import { useRoutes } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeStore } from '@/store/themeStore';
import { createAppTheme } from '@/theme';
import { routes } from '@/routes';
import OfflineAppShell from '@/components/shell/OfflineAppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const mode = useThemeStore((s) => s.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const element = useRoutes(routes);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <OfflineAppShell>{element}</OfflineAppShell>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
