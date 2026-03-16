import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './services/i18n';
import { CurrencyProvider } from './services/currencyService';
import { SettingsProvider } from './services/settingsService';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </LanguageProvider>
    </SettingsProvider>
  </StrictMode>,
);
