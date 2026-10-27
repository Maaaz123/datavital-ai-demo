import { useEffect } from 'react';
import { useThemeStore } from './store/themeStore';
import { setDocumentDirection } from './i18n';
import i18n from './i18n';

export function ThemeBootstrap({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    setDocumentDirection(i18n.language as 'en' | 'ar');
  }, []);

  return <>{children}</>;
}
