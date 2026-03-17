import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Target, 
  Calculator, 
  ChevronRight, 
  Info,
  CheckCircle2,
  Lock,
  Unlock,
  Coins,
  ArrowRight,
  Footprints,
  ShieldCheck,
  Calendar,
  Coffee,
  Zap,
  Wifi,
  Sun,
  ShoppingBag,
  Mountain,
  Home,
  Globe,
  Plane,
  Gem,
  Timer,
  Leaf,
  Star,
  Smile,
  Users,
  Crown,
  Rocket
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { motion } from 'motion/react';
import { APP_ID, UPSELL_LINK } from '../services/authService';
import { useLanguage } from '../services/i18n';
import { useCurrency, SUPPORTED_CURRENCIES } from '../services/currencyService';
import { useSettings } from '../services/settingsService';
import { MILESTONES_CONFIG } from '../constants/milestones';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WealthProgressBarProps {
  currentPortfolioValue: number;
  monthlyContribution: number;
  onMonthlyContributionChange: (val: number) => void;
  portfolio_credits: number;
  onDeductCredits: () => Promise<void>;
  role?: string;
}

export const WealthProgressBar: React.FC<WealthProgressBarProps> = ({ 
  currentPortfolioValue,
  monthlyContribution,
  onMonthlyContributionChange,
  portfolio_credits,
  onDeductCredits,
  role
}) => {
  const { t } = useLanguage();
  const { currency, formatCurrency, formatLocal, convert, fromLocal, rates } = useCurrency();
  const { settings, updateSettings } = useSettings();
  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0];
  
  const rate = rates[currency] || 1;
  const sliderMax = Math.ceil(20000 * rate / 1000) * 1000;
  const sliderStep = Math.max(1, Math.pow(10, Math.floor(Math.log10(rate)) + 1));

  const [monthlyExpenses, setMonthlyExpenses] = useState(800);
  const [inflationRate, setInflationRate] = useState(3);
  const [investmentReturn, setInvestmentReturn] = useState(10);
  const bufferYears = 2; // Fixed to 2 years as requested
  const [manualGoal, setManualGoal] = useState<number | null>(null);
  const [localManualGoal, setLocalManualGoal] = useState<string>("");
  const [useCalculatedGoal, setUseCalculatedGoal] = useState(true);

  // Use a ref to track if we are currently updating to avoid feedback loops
  const isUpdatingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync from settings
  useEffect(() => {
    if (settings?.simulationParams && !isUpdatingRef.current) {
      const p = settings.simulationParams;
      if (p.monthlyExpenses !== undefined && Math.abs(convert(p.monthlyExpenses) - monthlyExpenses) > 1) {
        setMonthlyExpenses(convert(p.monthlyExpenses));
      }
      if (p.inflationRate !== undefined && p.inflationRate !== inflationRate) setInflationRate(p.inflationRate);
      if (p.annualReturn !== undefined && p.annualReturn !== investmentReturn) setInvestmentReturn(p.annualReturn);
      if (p.manualGoal !== undefined && p.manualGoal !== manualGoal) {
        setManualGoal(p.manualGoal);
        setLocalManualGoal(p.manualGoal ? p.manualGoal.toString() : "");
      }
      if (p.useCalculatedGoal !== undefined && p.useCalculatedGoal !== useCalculatedGoal) setUseCalculatedGoal(p.useCalculatedGoal);
    }
  }, [settings?.simulationParams, convert]);

  const handleManualGoalBlur = () => {
    const val = Number(localManualGoal);
    if (!isNaN(val) && val > 0) {
      setManualGoal(val);
      handleUpdateSimulation({ manualGoal: val });
    } else {
      setLocalManualGoal(manualGoal ? manualGoal.toString() : "");
    }
  };

  const handleUpdateSimulation = (updates: any) => {
    // Update local state immediately for responsiveness
    if (updates.monthlyExpenses !== undefined) setMonthlyExpenses(updates.monthlyExpenses);
    if (updates.inflationRate !== undefined) setInflationRate(updates.inflationRate);
    if (updates.annualReturn !== undefined) setInvestmentReturn(updates.annualReturn);
    if (updates.manualGoal !== undefined) setManualGoal(updates.manualGoal);
    if (updates.useCalculatedGoal !== undefined) setUseCalculatedGoal(updates.useCalculatedGoal);

    // Debounce Firestore update
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    isUpdatingRef.current = true;
    debounceTimerRef.current = setTimeout(async () => {
      const convertedUpdates = { ...updates };
      if (updates.monthlyExpenses !== undefined) {
        convertedUpdates.monthlyExpenses = fromLocal(updates.monthlyExpenses);
      }
      if (updates.manualGoal !== undefined) {
        convertedUpdates.manualGoal = fromLocal(updates.manualGoal);
      }

      await updateSettings({
        simulationParams: {
          ...(settings?.simulationParams || {
            annualReturn: 10,
            years: 30,
            monthlyExpenses: 800,
            monthlyInvestment: 800,
            inflationRate: 3,
            manualGoal: null,
            useCalculatedGoal: true
          }),
          ...convertedUpdates
        }
      });
      isUpdatingRef.current = false;
    }, 1000);
  };

  // Convert current portfolio value (USD) to local currency for simulation
  const localPortfolioValue = useMemo(() => convert(currentPortfolioValue), [currentPortfolioValue, convert]);

  const MILESTONES = useMemo(() => MILESTONES_CONFIG.map((m, i) => ({
    ...m,
    title: t(`milestone_${i}_title`),
    desc: t(`milestone_${i}_desc`),
    encouragement: t(`milestone_${i}_encouragement`)
  })), [t]);

  // Credit deduction logic for sliders
  const handleSettingChange = async (setter: (val: number) => void, val: number) => {
    setter(val);
  };

  const simulationData = useMemo(() => {
    const data = [];
    let currentPortfolio = localPortfolioValue;
    const yearlyReturnRate = investmentReturn / 100;
    const yearlyInflationRate = inflationRate / 100;
    const yearlyContribution = monthlyContribution * 12;
    const initialYearlyExpenses = monthlyExpenses * 12;

    for (let year = 0; year <= 30; year++) {
      const expenses = initialYearlyExpenses * Math.pow(1 + yearlyInflationRate, year);
      const returns = currentPortfolio * yearlyReturnRate;
      const bufferAmount = expenses * bufferYears;
      
      data.push({
        year,
        expenses: Math.round(expenses),
        returns: Math.round(returns),
        portfolioValue: Math.round(currentPortfolio),
        bufferAmount: Math.round(bufferAmount),
      });

      currentPortfolio = (currentPortfolio * (1 + yearlyReturnRate)) + yearlyContribution;
    }
    return data;
  }, [localPortfolioValue, monthlyExpenses, inflationRate, monthlyContribution, investmentReturn, bufferYears]);

  const calculatedGoal = useMemo(() => {
    const intersection = simulationData.find(d => d.returns >= d.expenses);
    if (intersection) {
      // The goal is typically 25x annual expenses (4% rule) or where returns cover expenses
      // Plus the requested buffer years
      return intersection.portfolioValue + (intersection.expenses * bufferYears);
    }
    // Fallback if no intersection in 30 years
    return ((monthlyExpenses * 12) / (investmentReturn / 100)) + (monthlyExpenses * 12 * bufferYears);
  }, [simulationData, monthlyExpenses, investmentReturn, bufferYears]);

  const targetGoal = useCalculatedGoal ? calculatedGoal : (manualGoal || calculatedGoal);
  const progress = Math.min(100, (localPortfolioValue / targetGoal) * 100);
  const currentMilestoneIndex = Math.floor((progress / 100) * MILESTONES.length);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Target Input & Summary */}
      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-white p-5 md:p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 group relative">
                <Target className="text-emerald-600" />
                {t('wealthGoal')}
                <div className="relative group/tooltip">
                  <Info size={16} className="text-[#141414]/20 cursor-help hover:text-[#141414]/40 transition-colors" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-4 bg-[#141414] text-white text-xs rounded-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-2xl pointer-events-none">
                    <p className="leading-relaxed">
                      {t('wealthGoalDesc')}
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#141414]" />
                  </div>
                </div>
              </h3>
              <div className="flex items-center gap-2 bg-[#141414]/5 p-1 rounded-xl">
                <button 
                  onClick={() => {
                    setUseCalculatedGoal(true);
                    handleUpdateSimulation({ useCalculatedGoal: true });
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${useCalculatedGoal ? 'bg-white shadow-sm' : 'text-[#141414]/40'}`}
                >
                  {t('calculated')}
                </button>
                <button 
                  onClick={() => {
                    setUseCalculatedGoal(false);
                    handleUpdateSimulation({ useCalculatedGoal: false });
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!useCalculatedGoal ? 'bg-white shadow-sm' : 'text-[#141414]/40'}`}
                >
                  {t('manual')}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!useCalculatedGoal ? (
                <div>
                  <label className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1 block">{t('manualGoalAmount')}</label>
                  <input 
                    type="number"
                    value={localManualGoal}
                    onChange={(e) => setLocalManualGoal(e.target.value)}
                    onBlur={handleManualGoalBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleManualGoalBlur();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-[#141414]/10 focus:border-emerald-500 outline-none pb-2 transition-colors"
                    placeholder={t('enterGoal')}
                  />
                </div>
              ) : (
                <div>
                  <p className="hidden md:block text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('calculatedGoalAmount')}</p>
                  <p className="text-3xl md:text-4xl font-bold text-emerald-600">
                    {formatLocal(calculatedGoal, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                  </p>
                  <p className="hidden md:block text-xs text-[#141414]/40 mt-2">
                    {t('calculatedGoalDesc')}
                  </p>
                </div>
              )}

              {/* Progress Section */}
              <div className="mt-6 md:mt-10 space-y-8 md:space-y-12">
                {/* Milestone Progress with Badges at Ends */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    {/* Current Achievement Badge (Start) */}
                    <div className={`hidden md:flex w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${MILESTONES[Math.min(currentMilestoneIndex, MILESTONES.length - 1)].color} items-center justify-center text-white shrink-0 shadow-lg relative group`}>
                      {React.createElement(MILESTONES[Math.min(currentMilestoneIndex, MILESTONES.length - 1)].icon, { size: 24 })}
                      <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle2 size={8} className="text-white" />
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#141414] text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                        <p className="font-bold mb-1">{MILESTONES[Math.min(currentMilestoneIndex, MILESTONES.length - 1)].title}</p>
                        <p className="opacity-60 italic">"{MILESTONES[Math.min(currentMilestoneIndex, MILESTONES.length - 1)].desc}"</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#141414]" />
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-end px-1">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{t('nextTarget')}</p>
                          <p className="text-sm font-bold text-[#141414]">
                            {currentMilestoneIndex < MILESTONES.length - 1 
                              ? MILESTONES[currentMilestoneIndex + 1].title 
                              : t('ultimateFreedomReached')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('segmentProgress')}</p>
                          <p className="text-sm font-mono font-bold text-emerald-600">
                            {currentMilestoneIndex < MILESTONES.length - 1 
                              ? `${((progress % (100 / MILESTONES.length)) * MILESTONES.length).toFixed(1)}%`
                              : "100%"}
                          </p>
                        </div>
                      </div>

                      <div className="h-4 bg-[#141414]/5 rounded-full overflow-hidden relative shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${currentMilestoneIndex < MILESTONES.length - 1 
                              ? ((progress % (100 / MILESTONES.length)) * MILESTONES.length) 
                              : 100}%` 
                          }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full relative"
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </motion.div>
                      </div>
                      
                      <div className="flex justify-between items-center px-1">
                        <p className="text-[9px] font-bold text-[#141414]/30 uppercase"><span className="hidden md:inline">{t('overallJourney')}: </span>{progress.toFixed(1)}%</p>
                        <p className="text-[9px] font-bold text-[#141414]/30 uppercase">
                          <span className="hidden md:inline">{t('target')}: </span>{formatLocal(((currentMilestoneIndex + 1) / MILESTONES.length * targetGoal), { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Next Target Badge (End) */}
                    <div className={`hidden md:flex w-12 h-12 md:w-14 md:h-14 rounded-2xl ${currentMilestoneIndex < MILESTONES.length - 1 ? 'bg-[#141414]/5 text-[#141414]/10' : 'bg-gradient-to-br from-red-500 to-red-700 text-white'} items-center justify-center shrink-0 relative group`}>
                      {currentMilestoneIndex < MILESTONES.length - 1 ? (
                        <>
                          {React.createElement(MILESTONES[currentMilestoneIndex + 1].icon, { size: 24 })}
                          <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-[#141414]/5 rounded-full border-2 border-white flex items-center justify-center">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 rounded-full animate-pulse" />
                          </div>
                        </>
                      ) : (
                        <Rocket size={24} />
                      )}
                      {/* Tooltip */}
                      {currentMilestoneIndex < MILESTONES.length - 1 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#141414] text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                          <p className="font-bold mb-1">{MILESTONES[currentMilestoneIndex + 1].title}</p>
                          <p className="opacity-60 italic">"{MILESTONES[currentMilestoneIndex + 1].desc}"</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#141414]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balanced Encouragement Message */}
                  <div className="bg-emerald-50/50 p-4 md:p-5 rounded-3xl border border-emerald-100/50 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <p className="text-xs md:text-sm font-bold text-emerald-900 leading-relaxed">
                        {MILESTONES[Math.min(currentMilestoneIndex, MILESTONES.length - 1)].encouragement}
                      </p>
                    </div>
                  </div>
                </div>

                {/* All 20 Badges Grid */}
                <div className="pt-6 md:pt-8 border-t border-[#141414]/5">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h4 className="text-[10px] md:text-xs font-bold text-[#141414]/40 uppercase tracking-widest flex items-center gap-2">
                      <Star size={14} />
                      {t('wealthAchievementBadges')}
                    </h4>
                    <div className="px-2 md:px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] md:text-[10px] font-bold">
                      {currentMilestoneIndex + 1} / {MILESTONES.length} {t('unlocked')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-2 md:gap-3">
                    {MILESTONES.map((milestone, index) => {
                      const isAchieved = index <= currentMilestoneIndex;
                      const isNext = index === currentMilestoneIndex + 1;
                      
                      return (
                         <div key={index} className="relative group">
                          <motion.div
                            whileHover={{ scale: 1.1, y: -2 }}
                            className={`
                              aspect-square rounded-xl flex items-center justify-center transition-all duration-500
                              ${isAchieved 
                                ? `bg-gradient-to-br ${milestone.color} text-white shadow-md shadow-emerald-200/20` 
                                : isNext
                                  ? 'bg-white border-2 border-dashed border-emerald-100 text-emerald-200'
                                  : 'bg-[#141414]/5 text-[#141414]/5 grayscale opacity-20'
                              }
                            `}
                          >
                            {React.createElement(milestone.icon, { size: 20 })}
                            
                            {isAchieved && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center">
                                <CheckCircle2 size={8} className="text-white" />
                              </div>
                            )}
                            {isNext && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border border-emerald-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                              </div>
                            )}
                          </motion.div>

                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-3 bg-[#141414] text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            <p className="font-bold mb-1">{milestone.title}</p>
                            <p className="opacity-60 italic leading-tight">"{milestone.desc}"</p>
                            {!isAchieved && (
                              <p className="mt-2 text-emerald-400 font-bold">
                                {t('target')}: {formatLocal(((index / MILESTONES.length) * targetGoal), { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                              </p>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#141414]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simulation Inputs */}
        <div className="space-y-6">
          <div className="bg-white p-5 md:p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
            <h3 className="text-base md:text-lg font-bold mb-6 flex items-center gap-2">
              <Calculator size={20} />
              {t('simulationSettings')}
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-[#141414]/60 uppercase">{t('monthlyExpenses')}</label>
                  <span className="text-xs font-mono font-bold">{formatLocal(monthlyExpenses, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</span>
                </div>
                  <input 
                    type="range" min={Math.max(0, sliderStep)} max={sliderMax} step={sliderStep}
                    value={monthlyExpenses}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMonthlyExpenses(val);
                      handleUpdateSimulation({ monthlyExpenses: val });
                    }}
                    className="w-full accent-[#141414]"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-[#141414]/60 uppercase">{t('inflationRate')}</label>
                    <span className="text-xs font-mono font-bold">{inflationRate}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="15" step="0.5"
                    value={inflationRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setInflationRate(val);
                      handleUpdateSimulation({ inflationRate: val });
                    }}
                    className="w-full accent-[#141414]"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-[#141414]/60 uppercase">{t('monthlyContribution')}</label>
                    <span className="text-xs font-mono font-bold">{formatLocal(monthlyContribution, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</span>
                  </div>
                  <input 
                    type="range" min="0" max={sliderMax} step={sliderStep}
                    value={monthlyContribution}
                    onChange={(e) => onMonthlyContributionChange(Number(e.target.value))}
                    className="w-full accent-[#141414]"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-[#141414]/60 uppercase">{t('investmentReturn')}</label>
                    <span className="text-xs font-mono font-bold">{investmentReturn}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="30" step="0.5"
                    value={investmentReturn}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setInvestmentReturn(val);
                      handleUpdateSimulation({ annualReturn: val });
                    }}
                    className="w-full accent-[#141414]"
                  />
                </div>
              <div className="pt-4 border-t border-[#141414]/5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#141414]/60 uppercase">{t('currentPortfolio')}</span>
                  <span className="text-sm font-mono font-bold">{formatLocal(localPortfolioValue, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Charts & Tables */}
      <div className="grid grid-cols-1 gap-6 md:gap-8">
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
          <h3 className="text-base md:text-lg font-bold mb-6 md:mb-8 flex items-center gap-2">
            <TrendingUp size={20} />
            {t('growthProjection')}
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={simulationData}>
                <defs>
                  <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#141414" strokeOpacity={0.05} />
                <XAxis 
                  dataKey="year" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#141414', opacity: 0.4 }}
                  label={{ value: t('years'), position: 'insideBottom', offset: -5, fontSize: 10, fill: '#141414', opacity: 0.4 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#141414', opacity: 0.4 }}
                  tickFormatter={(value) => `${currentCurrency.symbol}${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatLocal(value, { maximumFractionDigits: 0, minimumFractionDigits: 0 }), '']}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area 
                  type="monotone" 
                  dataKey="returns" 
                  name={t('investmentReturns')} 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorReturns)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  name={t('annualExpenses')} 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorExpenses)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#141414]/5 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-[#141414]/5">
            <h3 className="text-base md:text-lg font-bold">{t('yearlyBreakdown')}</h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-30 bg-white">
                <tr className="bg-[#141414]/5 text-[#141414]/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-3 md:px-6 py-2 md:py-4 sticky left-0 z-40 bg-white border-b border-[#141414]/10">{t('year')}</th>
                  <th className="px-3 md:px-6 py-2 md:py-4 border-b border-[#141414]/10">{t('portfolioValue')}</th>
                  <th className="px-3 md:px-6 py-2 md:py-4 border-b border-[#141414]/10">{t('annualReturns')}</th>
                  <th className="px-3 md:px-6 py-2 md:py-4 border-b border-[#141414]/10">{t('annualExpenses')}</th>
                  <th className="px-3 md:px-6 py-2 md:py-4 border-b border-[#141414]/10">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]/5">
                {simulationData.map((row) => {
                  const isFree = row.returns >= row.expenses;
                  const isBufferedFree = isFree && row.portfolioValue >= (row.expenses / (investmentReturn / 100)) + row.bufferAmount;
                  return (
                    <tr key={row.year} className={`hover:bg-[#141414]/2 transition-colors group ${isBufferedFree ? 'bg-emerald-50/30' : isFree ? 'bg-yellow-50/30' : ''}`}>
                      <td className={cn(
                        "px-3 md:px-6 py-2 md:py-4 font-bold text-xs md:text-sm sticky left-0 z-20 transition-colors border-r border-[#141414]/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]",
                        isBufferedFree ? "bg-emerald-50 group-hover:bg-emerald-100" : isFree ? "bg-yellow-50 group-hover:bg-yellow-100" : "bg-white group-hover:bg-[#F5F5F0]"
                      )}>
                        {t('yearLabel', { n: row.year.toString() })}
                      </td>
                      <td className="px-3 md:px-6 py-2 md:py-4 font-mono text-xs md:text-sm">{formatLocal(row.portfolioValue, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</td>
                      <td className="px-3 md:px-6 py-2 md:py-4 font-mono text-xs md:text-sm text-emerald-600 font-bold">{formatLocal(row.returns, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</td>
                      <td className="px-3 md:px-6 py-2 md:py-4 font-mono text-xs md:text-sm text-red-500">{formatLocal(row.expenses, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</td>
                      <td className="px-3 md:px-6 py-2 md:py-4">
                        {isBufferedFree ? (
                          <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider">
                            {t('financialFree')}
                          </span>
                        ) : isFree ? (
                          <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-yellow-100 text-yellow-700 rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider">
                            {t('returnsCoverExpenses')}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-[#141414]/5 text-[#141414]/40 rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider">
                            {t('building')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
