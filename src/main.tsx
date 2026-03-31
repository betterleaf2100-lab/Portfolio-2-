import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './services/i18n';
import { CurrencyProvider } from './services/currencyService';
import { SettingsProvider } from './services/settingsService';
import { SpeedInsights } from '@vercel/speed-insights/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <App />
          <SpeedInsights />
        </CurrencyProvider>
      </LanguageProvider>
    </SettingsProvider>
  </StrictMode>,
);
