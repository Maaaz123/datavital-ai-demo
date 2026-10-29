import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './i18n';
import './styles/global.css';
import App from './App';
import { ThemeBootstrap } from './ThemeBootstrap';

if (import.meta.env.PROD) {
  void import('./pwa').then(({ registerPwaServiceWorker }) => registerPwaServiceWorker());
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <ThemeBootstrap>
        <App />
      </ThemeBootstrap>
    </BrowserRouter>
  </StrictMode>,
);
