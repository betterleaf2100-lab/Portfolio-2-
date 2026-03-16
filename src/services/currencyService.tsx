import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './settingsService';

export type CurrencyCode = 'USD' | 'TWD' | 'HKD' | 'CNY' | 'MYR' | 'SGD' | 'JPY' | 'EUR' | 'GBP';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: {
    'zh-TW': string;
    'zh-CN': string;
    'en': string;
  };
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: { 'zh-TW': '美元', 'zh-CN': '美元', 'en': 'US Dollar' } },
  { code: 'TWD', symbol: 'NT$', name: { 'zh-TW': '新台幣', 'zh-CN': '新台币', 'en': 'Taiwan Dollar' } },
  { code: 'HKD', symbol: 'HK$', name: { 'zh-TW': '港幣', 'zh-CN': '港币', 'en': 'Hong Kong Dollar' } },
  { code: 'CNY', symbol: '¥', name: { 'zh-TW': '人民幣', 'zh-CN': '人民币', 'en': 'Chinese Yuan' } },
  { code: 'MYR', symbol: 'RM', name: { 'zh-TW': '馬來西亞令吉', 'zh-CN': '马来西亚令吉', 'en': 'Malaysian Ringgit' } },
  { code: 'SGD', symbol: 'S$', name: { 'zh-TW': '新加坡元', 'zh-CN': '新加坡元', 'en': 'Singapore Dollar' } },
  { code: 'JPY', symbol: '¥', name: { 'zh-TW': '日圓', 'zh-CN': '日圆', 'en': 'Japanese Yen' } },
  { code: 'EUR', symbol: '€', name: { 'zh-TW': '歐元', 'zh-CN': '欧元', 'en': 'Euro' } },
  { code: 'GBP', symbol: '£', name: { 'zh-TW': '英鎊', 'zh-CN': '英镑', 'en': 'British Pound' } },
];

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  rates: Record<string, number>;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatLocal: (value: number, options?: Intl.NumberFormatOptions) => string;
  convert: (valueUsd: number) => number;
  fromLocal: (valueLocal: number) => number;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('app_currency');
    return (saved as CurrencyCode) || 'USD';
  });

  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const lastSettingsCurrency = React.useRef<string | null>(null);

  // Sync from Firebase
  useEffect(() => {
    if (settings?.currency && settings.currency !== lastSettingsCurrency.current) {
      setCurrencyState(settings.currency as CurrencyCode);
      lastSettingsCurrency.current = settings.currency;
      localStorage.setItem('app_currency', settings.currency);
    }
  }, [settings?.currency]);

  const setCurrency = (code: CurrencyCode) => {
    if (code === currency) return;
    setCurrencyState(code);
    localStorage.setItem('app_currency', code);
    updateSettings({ currency: code });
  };

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data && data.rates) {
          setRates(data.rates);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates if API fails
        setRates({
          USD: 1,
          TWD: 31.5,
          HKD: 7.8,
          CNY: 7.2,
          MYR: 4.7,
          SGD: 1.35,
          JPY: 150,
          EUR: 0.92,
          GBP: 0.79
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
    // Refresh rates every hour
    const interval = setInterval(fetchRates, 3600000);
    return () => clearInterval(interval);
  }, []);

  const convert = (valueUsd: number) => {
    const rate = rates[currency] || 1;
    return valueUsd * rate;
  };

  const fromLocal = (valueLocal: number) => {
    const rate = rates[currency] || 1;
    return valueLocal / rate;
  };

  const formatCurrency = (valueUsd: number, options: Intl.NumberFormatOptions = {}) => {
    const convertedValue = convert(valueUsd);
    const mergedOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    };

    // Fix potential RangeError: minimumFractionDigits must be <= maximumFractionDigits
    if (mergedOptions.maximumFractionDigits !== undefined && 
        mergedOptions.minimumFractionDigits !== undefined && 
        mergedOptions.minimumFractionDigits > mergedOptions.maximumFractionDigits) {
      mergedOptions.minimumFractionDigits = mergedOptions.maximumFractionDigits;
    }

    return new Intl.NumberFormat(undefined, mergedOptions).format(convertedValue);
  };

  const formatLocal = (valueLocal: number, options: Intl.NumberFormatOptions = {}) => {
    const mergedOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    };

    // Fix potential RangeError: minimumFractionDigits must be <= maximumFractionDigits
    if (mergedOptions.maximumFractionDigits !== undefined && 
        mergedOptions.minimumFractionDigits !== undefined && 
        mergedOptions.minimumFractionDigits > mergedOptions.maximumFractionDigits) {
      mergedOptions.minimumFractionDigits = mergedOptions.maximumFractionDigits;
    }

    return new Intl.NumberFormat(undefined, mergedOptions).format(valueLocal);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, formatCurrency, formatLocal, convert, fromLocal, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};
