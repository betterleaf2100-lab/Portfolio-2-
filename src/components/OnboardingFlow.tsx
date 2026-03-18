import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, HelpCircle, Globe, DollarSign, Wallet, TrendingUp, Upload, Target, Info } from 'lucide-react';
import { useLanguage, Language } from '../services/i18n';
import { useCurrency, SUPPORTED_CURRENCIES } from '../services/currencyService';
import { useSettings } from '../services/settingsService';

interface OnboardingFlowProps {
  onComplete: () => void;
  onViewChange: (view: 'dashboard' | 'wealth' | 'invest' | 'settings') => void;
  initialStep?: number;
}

export function OnboardingFlow({ onComplete, onViewChange, initialStep = 1 }: OnboardingFlowProps) {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency, convert, fromLocal } = useCurrency();
  const { settings, updateSettings } = useSettings();

  const [step, setStep] = useState(initialStep);
  const [expenses, setExpenses] = useState(800);
  const [investment, setInvestment] = useState(800);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (settings?.simulationParams) {
      setExpenses(convert(settings.simulationParams.monthlyExpenses || 800));
      setInvestment(convert(settings.simulationParams.monthlyInvestment || 800));
    }
  }, [settings?.simulationParams, convert]);

  useEffect(() => {
    if (step === 1) onViewChange('settings');
    else if (step === 2 || step === 3) onViewChange('wealth');
    else if (step === 4) onViewChange('dashboard');
    else if (step === 5) onViewChange('invest');
  }, [step, onViewChange]);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Save settings
      await updateSettings({
        simulationParams: {
          ...(settings?.simulationParams || {
            annualReturn: 10,
            years: 30,
            inflationRate: 3,
            useCalculatedGoal: true,
            manualGoal: null
          }),
          monthlyExpenses: fromLocal(expenses),
          monthlyInvestment: fromLocal(investment)
        }
      });
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      onViewChange('dashboard');
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    onViewChange('dashboard');
    onComplete();
  };

  return (
    <div className="fixed top-16 inset-x-0 bottom-0 z-[40] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={`flex-1 transition-all duration-500 ${s <= step ? 'bg-gray-900' : 'bg-transparent'}`}
            />
          ))}
        </div>

        {/* Close Button */}
        <button 
          onClick={onComplete}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 pt-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep1Title')}</h2>
                    <p className="text-gray-500">{t('onboardingStep1Desc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('language')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['zh-TW', 'zh-CN', 'en'] as Language[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                            language === lang 
                              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {lang === 'zh-TW' ? '繁體中文' : lang === 'zh-CN' ? '简体中文' : 'English'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('currency')}</label>
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <button
                          key={curr.code}
                          onClick={() => setCurrency(curr.code)}
                          className={`py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            currency === curr.code 
                              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <span className="text-xs opacity-70">{curr.symbol}</span>
                          {curr.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep2Title')}</h2>
                    <p className="text-gray-500">{t('onboardingStep2Desc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('monthlyExpenses')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-400">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                      </div>
                      <input
                        type="number"
                        value={expenses}
                        onChange={(e) => setExpenses(Number(e.target.value))}
                        className="block w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('monthlyContribution')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-400">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                      </div>
                      <input
                        type="number"
                        value={investment}
                        onChange={(e) => setInvestment(Number(e.target.value))}
                        className="block w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep3Title')}</h2>
                    <p className="text-gray-500">{t('onboardingStep3Desc')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('calculatedGoalAmount')}</p>
                      <p className="text-lg font-bold text-gray-900">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol} 1,200,000</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('currentPortfolio')}</p>
                      <p className="text-lg font-bold text-gray-900">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol} 150,000</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('wealthFreedomProgress')}</p>
                      <p className="text-2xl font-bold text-gray-900">12.5%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('nextTarget')}</p>
                      <p className="text-sm font-semibold text-gray-900">{t('milestone_2_title')}</p>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[12.5%] rounded-full shadow-lg shadow-emerald-200/50" />
                  </div>
                  <p className="mt-4 text-sm text-gray-600 leading-relaxed italic">
                    {t('milestone_1_encouragement')}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep4Title')}</h2>
                    <p className="text-gray-500">{t('onboardingStep4Desc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex gap-3">
                    <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-purple-900">{t('onboardingStep4Reminder')}</p>
                  </div>

                  <div className="bg-gray-900 rounded-2xl p-6 text-white space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('assetAllocation')}</p>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                    </div>
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 w-[60%]" />
                      <div className="bg-blue-500 w-[25%]" />
                      <div className="bg-amber-500 w-[15%]" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">VOO (S&P 500)</span>
                        <span className="font-bold">60%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">QQQ (Nasdaq 100)</span>
                        <span className="font-bold">25%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">TSLA (Tesla)</span>
                        <span className="font-bold">15%</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 italic">
                    {t('onboardingStep4NextTime')}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboardingStep5Title')}</h2>
                    <p className="text-gray-500">{t('onboardingStep5Desc')}</p>
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">AI</div>
                    <p className="text-sm font-medium text-indigo-900">每月定投規劃、風險分析與倉位參考</p>
                  </div>
                  <div className="h-24 bg-white/50 rounded-xl border border-indigo-100 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-indigo-300" />
                  </div>
                  <p className="text-center font-bold text-emerald-600 text-lg">
                    {t('onboardingStep5Final')}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-gray-900 font-bold transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  {t('back')}
                </button>
              )}
              {step <= 2 && (
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-gray-600 font-medium transition-colors"
                >
                  {t('skip')}
                </button>
              )}
            </div>
            
            <button
              onClick={handleNext}
              className="flex-1 bg-gray-900 hover:bg-black text-white py-4 px-6 rounded-2xl font-bold shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2 group"
            >
              {step === 5 ? t('finish') : t('next')}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HelpIcon({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      title={t('helpTooltip')}
      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}
