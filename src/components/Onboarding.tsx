import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, Language } from '../services/i18n';
import { useCurrency, CurrencyCode, SUPPORTED_CURRENCIES } from '../services/currencyService';
import { useSettings } from '../services/settingsService';
import { 
  Globe, 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  Target, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  X,
  HelpCircle
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface OnboardingProps {
  onComplete: () => void;
  startStep?: number;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, startStep = 1 }) => {
  const { t, language, setLanguage } = useLanguage();
  const { currency, setCurrency, formatLocal } = useCurrency();
  const { settings, updateSettings } = useSettings();
  const [step, setStep] = useState(startStep);
  const [expenses, setExpenses] = useState(settings?.simulationParams.monthlyExpenses || 800);
  const [investment, setInvestment] = useState(settings?.simulationParams.monthlyInvestment || 800);

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    if (!settings?.onboardingCompleted) {
      await updateSettings({
        onboardingCompleted: true,
        simulationParams: {
          ...settings!.simulationParams,
          monthlyExpenses: expenses,
          monthlyInvestment: investment,
        }
      });
    }
    onComplete();
  };

  const handleSkip = async () => {
    if (!settings?.onboardingCompleted) {
      await updateSettings({ onboardingCompleted: true });
    }
    onComplete();
  };

  const mockPieData = [
    { name: 'US Stocks', value: 45 },
    { name: 'ETFs', value: 25 },
    { name: 'Crypto', value: 15 },
    { name: 'Bonds', value: 10 },
    { name: 'Cash', value: 5 },
  ];
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep1Title')}</h2>
              <p className="text-gray-500 mt-2">{t('onboardingStep1Desc')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('language')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['zh-TW', 'zh-CN', 'en'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                        language === lang
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-200'
                      }`}
                    >
                      {lang === 'zh-TW' ? '繁體中文' : lang === 'zh-CN' ? '简体中文' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('currency')}</label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => setCurrency(curr.code)}
                      className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                        currency === curr.code
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-200'
                      }`}
                    >
                      {curr.code} ({curr.symbol})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep2Title')}</h2>
              <p className="text-gray-500 mt-2">{t('onboardingStep2Desc')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('monthlyExpenses')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                  </div>
                  <input
                    type="number"
                    value={expenses}
                    onChange={(e) => setExpenses(Number(e.target.value))}
                    className="block w-full pl-10 pr-12 py-3 border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('monthlyInvestment')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                  </div>
                  <input
                    type="number"
                    value={investment}
                    onChange={(e) => setInvestment(Number(e.target.value))}
                    className="block w-full pl-10 pr-12 py-3 border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep3Title')}</h2>
              <p className="text-gray-500 mt-2">{t('onboardingStep3Desc')}</p>
            </div>

            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-orange-800">{t('wealthFreedomProgress')}</span>
                <span className="text-lg font-bold text-orange-900">15.4%</span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-4 mb-4">
                <div className="bg-orange-500 h-4 rounded-full" style={{ width: '15.4%' }}></div>
              </div>
              <p className="text-xs text-orange-700 italic">{t('onboardingMockProgress')}</p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep4Title')}</h2>
              <p className="text-gray-500 mt-2">{t('onboardingStep4Desc')}</p>
            </div>

            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <RePieChart>
                  <Pie
                    data={mockPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2 text-center">{t('onboardingMockAllocation')}</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PieChart className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep5Title')}</h2>
              <p className="text-gray-500 mt-2">{t('onboardingStep5Desc')}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['Low', 'Medium', 'High'].map((risk) => (
                <div key={risk} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{risk} Risk</div>
                  <div className="text-sm font-bold text-gray-700">
                    {risk === 'Low' ? '40/60' : risk === 'Medium' ? '60/40' : '80/20'}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center italic">{t('onboardingMockPlanner')}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
          <motion.div
            className="h-full bg-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-8 pt-10">
          <button 
            onClick={handleSkip}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`flex items-center text-sm font-medium transition-colors ${
                step === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('onboardingPrev')}
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    step === i + 1 ? 'w-4 bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              {step === totalSteps ? t('onboardingFinish') : t('onboardingNext')}
              {step !== totalSteps && <ChevronRight className="w-4 h-4 ml-1" />}
            </button>
          </div>

          {!settings?.onboardingCompleted && step < totalSteps && (
            <div className="mt-4 text-center">
              <button 
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t('onboardingSkip')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const HelpIcon: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button
    onClick={onClick}
    className={`p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all ${className}`}
    title="Help & Guide"
  >
    <HelpCircle className="w-5 h-5" />
  </button>
);
