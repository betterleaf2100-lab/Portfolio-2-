/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Upload, 
  TrendingUp, 
  History, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  Check,
  Target,
  X,
  Pencil,
  Loader2,
  Trash2,
  RefreshCw,
  LogOut,
  Menu,
  ChevronRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, orderBy, limit, setDoc, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { LoginPage } from './components/LoginPage';
import { syncUserRoleAndCredits, deductCredits, UserData, APP_ID, getUpsellLink, COST_PER_USE } from './services/authService';
import { extractPortfolioFromImage, fetchMarketData, PortfolioItem, Transaction } from './services/geminiService';
import { WealthProgressBar } from './components/WealthProgressBar';
import { InvestmentPlanner } from './components/InvestmentPlanner';
import { BetterleafPortfolio } from './components/BetterleafPortfolio';
import { ApiTester } from './components/ApiTester';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLanguage, Language } from './services/i18n';
import { useCurrency, SUPPORTED_CURRENCIES } from './services/currencyService';
import { MILESTONES_CONFIG } from './constants/milestones';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

import { useSettings } from './services/settingsService';

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency, formatCurrency, convert, rates } = useCurrency();
  const { settings, updateSettings } = useSettings();

  const [monthlyContribution, setMonthlyContributionState] = useState(800);
  const isUpdatingContributionRef = useRef(false);
  const contributionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const setMonthlyContribution = (val: number) => {
    if (val === monthlyContribution) return;
    setMonthlyContributionState(val);
    
    if (contributionDebounceRef.current) clearTimeout(contributionDebounceRef.current);
    
    isUpdatingContributionRef.current = true;
    contributionDebounceRef.current = setTimeout(async () => {
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
          monthlyInvestment: val 
        }
      });
      isUpdatingContributionRef.current = false;
    }, 500);
  };

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUpsell, setShowUpsell] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'history' | 'wealth' | 'invest' | 'betterleaf' | 'settings'>('dashboard');
  const [updateMode, setUpdateMode] = useState<'merge' | 'replace'>('merge');
  const [editingItem, setEditingItem] = useState<{ type: 'portfolio' | 'history', id: string } | null>(null);
  const [chartDimension, setChartDimension] = useState<'symbol' | 'sector' | 'country' | 'assetType'>('symbol');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [spyPrice, setSpyPrice] = useState<number>(500); // Default SPY price
  const [testSymbol, setTestSymbol] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Investment Planner Persisted State
  const [plannerState, setPlannerState] = useState<{
    lumpSum: number;
    riskId: 'conservative' | 'moderate' | 'aggressive' | 'custom';
    isProjected: boolean;
    projectionData: any[];
    projectedAnnualReturns: any[];
    aiReasoning: string | null;
    marketSentiment: string | null;
    isBacktested: boolean;
    timeRange: '1Y' | '5Y' | '10Y' | 'YTD' | 'MAX';
  }>({
    lumpSum: 0,
    riskId: 'moderate',
    isProjected: false,
    projectionData: [],
    projectedAnnualReturns: [],
    aiReasoning: null,
    marketSentiment: null,
    isBacktested: false,
    timeRange: '10Y'
  });

  // Sync monthlyContribution from settings
  useEffect(() => {
    if (settings?.simulationParams?.monthlyInvestment !== undefined && 
        settings.simulationParams.monthlyInvestment !== monthlyContribution &&
        !isUpdatingContributionRef.current) {
      setMonthlyContributionState(settings.simulationParams.monthlyInvestment);
    }
  }, [settings?.simulationParams?.monthlyInvestment]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const totalValue = useMemo(() => 
    portfolio.reduce((sum, item) => sum + (item.quantity * item.currentPrice * item.fxRateToUsd), 0),
  [portfolio]);

  const riskMetrics = useMemo(() => {
    const activePortfolio = portfolio.filter(item => item.quantity > 0);
    let totalPeWeighted = 0;
    let peWeightSum = 0;
    let totalDailyChange = 0;
    let totalValueForChange = 0;

    activePortfolio.forEach(item => {
      const itemValue = item.quantity * item.currentPrice * item.fxRateToUsd;
      
      if (item.changePercent !== undefined) {
        totalDailyChange += itemValue * (item.changePercent / 100);
        totalValueForChange += itemValue;
      }

      if (item.forwardPe && item.forwardPe > 0) {
        totalPeWeighted += item.forwardPe * itemValue;
        peWeightSum += itemValue;
      }
    });

    const avgPe = peWeightSum > 0 ? totalPeWeighted / peWeightSum : 0;
    const avgDailyChangePercent = totalValueForChange > 0 ? (totalDailyChange / totalValueForChange) * 100 : 0;

    // Calculate total P/L
    let totalCostUsd = 0;
    let totalCurrentValueUsd = 0;
    activePortfolio.forEach(item => {
      totalCurrentValueUsd += item.quantity * item.currentPrice * item.fxRateToUsd;
      totalCostUsd += item.quantity * item.averagePrice * item.fxRateToUsd;
    });
    const totalPl = totalCurrentValueUsd - totalCostUsd;
    const totalPlPercent = totalCostUsd > 0 ? (totalPl / totalCostUsd) * 100 : 0;

    return {
      avgPe,
      totalDailyChange,
      avgDailyChangePercent,
      totalPl,
      totalPlPercent
    };
  }, [portfolio]);

  const freedomProgress = useMemo(() => {
    if (!settings?.simulationParams) return 0;
    const p = settings.simulationParams;
    const monthlyExpenses = p.monthlyExpenses || 800;
    const inflationRate = p.inflationRate || 3;
    const investmentReturn = p.annualReturn || 10;
    const monthlyInvestment = p.monthlyInvestment || 800;
    const useCalculatedGoal = p.useCalculatedGoal !== false;
    const manualGoal = p.manualGoal;

    const localPortfolioValue = convert(totalValue);
    
    // Simple simulation for goal calculation
    const yearlyReturnRate = investmentReturn / 100;
    const yearlyInflationRate = inflationRate / 100;
    const yearlyContribution = monthlyInvestment * 12;
    const initialYearlyExpenses = monthlyExpenses * 12;

    let currentPortfolio = localPortfolioValue;
    let calculatedGoal = (monthlyExpenses * 12) / (investmentReturn / 100); // Fallback

    for (let year = 0; year <= 30; year++) {
      const expenses = initialYearlyExpenses * Math.pow(1 + yearlyInflationRate, year);
      const returns = currentPortfolio * yearlyReturnRate;
      if (returns >= expenses) {
        calculatedGoal = currentPortfolio;
        break;
      }
      currentPortfolio = (currentPortfolio * (1 + yearlyReturnRate)) + yearlyContribution;
    }

    const targetGoal = useCalculatedGoal ? calculatedGoal : (manualGoal || calculatedGoal);
    return Math.min(100, (localPortfolioValue / targetGoal) * 100);
  }, [totalValue, settings?.simulationParams, convert]);

  const monthlyInvestmentTotal = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
      .filter(tx => tx.type === 'BUY' && new Date(tx.date) >= startOfMonth)
      .reduce((sum, tx) => sum + (tx.total * tx.fxRateToUsd), 0);
  }, [transactions]);

  const monthlyInvestmentProgress = useMemo(() => {
    if (monthlyContribution <= 0) return 0;
    return Math.min(100, (convert(monthlyInvestmentTotal) / monthlyContribution) * 100);
  }, [monthlyInvestmentTotal, monthlyContribution, convert]);

  const currentMilestone = useMemo(() => {
    const index = Math.floor((freedomProgress / 100) * MILESTONES_CONFIG.length);
    const safeIndex = Math.min(MILESTONES_CONFIG.length - 1, Math.max(0, index));
    const config = MILESTONES_CONFIG[safeIndex];
    return {
      ...config,
      title: t(`milestone_${safeIndex}_title`)
    };
  }, [freedomProgress, t]);

  const sortedPortfolio = useMemo(() => {
    let items = [...portfolio].filter(p => p.quantity > 0.000001).map(item => {
      const totalUsd = item.quantity * item.currentPrice * item.fxRateToUsd;
      const costUsd = item.quantity * item.averagePrice * item.fxRateToUsd;
      const pl = totalUsd - costUsd;
      const plPercentage = costUsd > 0 ? (pl / costUsd) * 100 : 0;
      return { ...item, totalUsd, pl, plPercentage };
    });

    if (sortConfig !== null) {
      items.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [portfolio, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const processImage = async (file: File) => {
    if (!user || !userData) return;

    // Credit Check & Deduction
    if (userData.role !== 'admin') {
      const success = await deductCredits(user.uid);
      if (!success) {
        setShowUpsell(true);
        return;
      }
      // Update local credits optimistically or wait for sync
      setUserData(prev => prev ? { ...prev, credits: prev.credits - COST_PER_USE } : null);
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const result = await extractPortfolioFromImage(base64);
          
          // If we have symbols, fetch real-time data from Yahoo Finance to supplement extraction
          if (result.items && result.items.length > 0) {
            const symbols = result.items.map((item: any) => item.symbol).filter(Boolean);
            if (symbols.length > 0) {
              try {
                const marketData = await fetchMarketData(symbols);
                if (marketData && marketData.data) {
                  // Merge market data into extracted items
                  result.items = result.items.map((item: any) => {
                    const market = marketData.data.find((d: any) => d.symbol === item.symbol);
                    if (market) {
                      return {
                        ...item,
                        currentPrice: market.price || item.currentPrice || item.price,
                        forwardPe: market.forwardPe || item.forwardPe || 0,
                        changePercent: market.changePercent || item.changePercent || 0,
                        name: market.name || item.name
                      };
                    }
                    return item;
                  });
                }
              } catch (marketError) {
                console.warn("Failed to fetch market data for extracted items, using AI estimates only:", marketError);
              }
            }
          }
          
          setExtractedData(result);
        } catch (err) {
          console.error("Error in image processing pipeline:", err);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImage(file);
  };

  React.useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [portfolio]); // Re-bind if needed, though processImage is stable

  const handleExtractedItemChange = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    const newItems = [...extractedData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setExtractedData({ ...extractedData, items: newItems });
  };

  const removeExtractedItem = (index: number) => {
    if (!extractedData) return;
    const newItems = extractedData.items.filter((_: any, i: number) => i !== index);
    setExtractedData({ ...extractedData, items: newItems });
  };

  const confirmExtraction = async () => {
    if (!extractedData || !user) return;

    if (extractedData.type === 'PORTFOLIO') {
      const newItems: PortfolioItem[] = extractedData.items.map((item: any) => ({
        symbol: item.symbol,
        name: item.name || item.symbol,
        quantity: Number(item.quantity),
        averagePrice: Number(item.price),
        currentPrice: Number(item.currentPrice || item.price),
        value: Number(item.quantity) * Number(item.currentPrice || item.price) * Number(item.fxRateToUsd),
        allocation: 0,
        currency: item.currency || 'USD',
        fxRateToUsd: Number(item.fxRateToUsd) || 1,
        forwardPe: Number(item.forwardPe) || 0,
        changePercent: Number(item.changePercent) || 0,
        sector: item.sector || 'Others',
        country: item.country || 'Unknown',
        assetType: item.assetType || 'Stock'
      }));

      let updatedPortfolio: PortfolioItem[];
      if (updateMode === 'replace') {
        updatedPortfolio = newItems;
      } else {
        const merged = [...portfolio];
        newItems.forEach(newItem => {
          const idx = merged.findIndex(p => p.symbol === newItem.symbol);
          if (idx >= 0) {
            merged[idx] = newItem; // Update existing
          } else {
            merged.push(newItem); // Add new
          }
        });
        updatedPortfolio = merged;
      }
      
      setPortfolio(updatedPortfolio);
      
      // Save Portfolio to Sandbox
      const portfolioRef = doc(db, "users", user.uid, "apps", APP_ID, "settings", "portfolio");
      await setDoc(portfolioRef, { items: updatedPortfolio, updatedAt: serverTimestamp() });

      const sysTx: any = {
        date: new Date().toISOString().split('T')[0],
        type: 'HOLDING_UPDATE',
        symbol: updateMode === 'replace' ? 'FULL_RESET' : 'MERGE_UPDATE',
        quantity: 0,
        price: 0,
        total: 0,
        currency: 'USD',
        fxRateToUsd: 1,
        createdAt: serverTimestamp()
      };
      
      const transactionsRef = collection(db, "users", user.uid, "apps", APP_ID, "history");
      await addDoc(transactionsRef, sysTx);

    } else if (extractedData.type === 'TRADE') {
      const transactionsRef = collection(db, "users", user.uid, "apps", APP_ID, "history");
      const portfolioRef = doc(db, "users", user.uid, "apps", APP_ID, "settings", "portfolio");
      
      let currentPortfolio = [...portfolio];

      for (const trade of extractedData.items) {
        const tx: any = {
          date: trade.date || new Date().toISOString().split('T')[0],
          type: trade.tradeType === 'SELL' ? 'SELL' : 'BUY',
          symbol: trade.symbol,
          quantity: Number(trade.quantity),
          price: Number(trade.price),
          total: Number(trade.quantity) * Number(trade.price) * Number(trade.fxRateToUsd),
          currency: trade.currency || 'USD',
          fxRateToUsd: Number(trade.fxRateToUsd) || 1,
          createdAt: serverTimestamp()
        };

        await addDoc(transactionsRef, tx);

        const existingIdx = currentPortfolio.findIndex(p => p.symbol === trade.symbol);
        if (existingIdx >= 0) {
          const existing = currentPortfolio[existingIdx];
          if (tx.type === 'BUY') {
            const newQty = existing.quantity + tx.quantity;
            const existingValueUsd = existing.quantity * existing.averagePrice * existing.fxRateToUsd;
            const newValueUsd = tx.quantity * tx.price * tx.fxRateToUsd;
            const newAvgUsd = (existingValueUsd + newValueUsd) / newQty;
            const newAvgPrice = tx.currency === existing.currency ? (existing.quantity * existing.averagePrice + tx.quantity * tx.price) / newQty : newAvgUsd / tx.fxRateToUsd;
            
            currentPortfolio[existingIdx] = { 
              ...existing, 
              quantity: newQty, 
              averagePrice: newAvgPrice,
              currency: tx.currency,
              fxRateToUsd: tx.fxRateToUsd
            };
          } else {
            const newQty = existing.quantity - tx.quantity;
            if (newQty <= 0.000001) {
              currentPortfolio = currentPortfolio.filter(p => p.symbol !== trade.symbol);
            } else {
              currentPortfolio[existingIdx] = { ...existing, quantity: newQty };
            }
          }
        } else if (tx.type === 'BUY') {
          currentPortfolio.push({
            symbol: trade.symbol,
            name: trade.name || trade.symbol,
            quantity: tx.quantity,
            averagePrice: tx.price,
            currentPrice: tx.price,
            value: tx.quantity * tx.price * tx.fxRateToUsd,
            allocation: 0,
            currency: tx.currency,
            fxRateToUsd: tx.fxRateToUsd,
            sector: trade.sector || 'Others',
            country: trade.country || 'Unknown',
            assetType: trade.assetType || 'Stock',
            forwardPe: Number(trade.forwardPe) || 0,
            changePercent: Number(trade.changePercent) || 0
          });
        }
      }
      
      setPortfolio(currentPortfolio);
      await setDoc(portfolioRef, { items: currentPortfolio, updatedAt: serverTimestamp() });
    }

    setExtractedData(null);
  };

  const deletePortfolioItem = (symbol: string) => {
    setConfirmModal({
      show: true,
      title: t('removeAsset'),
      message: t('removeAssetConfirm', { symbol }),
      onConfirm: async () => {
        const updated = portfolio.filter(p => p.symbol !== symbol);
        setPortfolio(updated);
        if (user) {
          const portfolioRef = doc(db, "users", user.uid, "apps", APP_ID, "settings", "portfolio");
          await setDoc(portfolioRef, { items: updated, updatedAt: serverTimestamp() });
        }
      }
    });
  };

  const deleteTransaction = (id: string) => {
    setConfirmModal({
      show: true,
      title: t('deleteTransaction'),
      message: t('deleteTransactionConfirm'),
      onConfirm: async () => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        if (user) {
          const txRef = doc(db, "users", user.uid, "apps", APP_ID, "history", id);
          await deleteDoc(txRef);
        }
      }
    });
  };

  const updatePortfolioItem = async (symbol: string, updates: Partial<PortfolioItem>) => {
    const updated = portfolio.map(p => p.symbol === symbol ? { ...p, ...updates } : p);
    setPortfolio(updated);
    setEditingItem(null);
    if (user) {
      const portfolioRef = doc(db, "users", user.uid, "apps", APP_ID, "settings", "portfolio");
      await setDoc(portfolioRef, { items: updated, updatedAt: serverTimestamp() });
    }
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setEditingItem(null);
  };

  const filteredPortfolio = useMemo(() => {
    if (!selectedCategory || chartDimension === 'symbol') return portfolio.filter(p => p.quantity > 0);
    return portfolio.filter(p => p.quantity > 0 && p[chartDimension] === selectedCategory);
  }, [portfolio, selectedCategory, chartDimension]);

  const chartData = useMemo(() => {
    const activePortfolio = portfolio.filter(item => item.quantity > 0.000001);
    
    const result = (() => {
      // Drill down logic: If a category is selected and we are not in 'symbol' view
      if (selectedCategory && chartDimension !== 'symbol') {
        return activePortfolio
          .filter(item => (item[chartDimension] || 'Others') === selectedCategory)
          .map(item => ({
            name: item.symbol,
            value: item.quantity * item.currentPrice * item.fxRateToUsd,
            isAsset: true,
            symbol: item.symbol
          }));
      }

      if (chartDimension === 'symbol') {
        return activePortfolio.map(item => ({
          name: item.symbol,
          value: item.quantity * item.currentPrice * item.fxRateToUsd,
          isAsset: true,
          symbol: item.symbol
        }));
      }

      const groups: Record<string, number> = {};
      activePortfolio.forEach(item => {
        const key = item[chartDimension] || 'Others';
        groups[key] = (groups[key] || 0) + (item.quantity * item.currentPrice * item.fxRateToUsd);
      });

      return Object.entries(groups).map(([name, value]) => ({ 
        name, 
        value,
        isAsset: false,
        symbol: undefined
      }));
    })();

    return result.sort((a, b) => b.value - a.value);
  }, [portfolio, chartDimension, selectedCategory]);

  const handleRefreshData = async (isAuto = false) => {
    const symbols = portfolio.filter(p => p.quantity > 0).map(p => p.symbol);
    if (symbols.length === 0) return;
    
    // Only deduct credits if NOT an auto-refresh and NOT an admin
    if (!isAuto && userData && userData.role !== 'admin') {
      const success = await deductCredits(user!.uid);
      if (!success) {
        setShowUpsell(true);
        return;
      }
      setUserData(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
    }

    setIsUploading(true);
    try {
      const { spyPrice: newSpyPrice, data } = await fetchMarketData(symbols);
      setSpyPrice(newSpyPrice);
      
      const updatedPortfolio = portfolio.map(item => {
        const market = data.find((d: any) => d.symbol === item.symbol);
        if (market) {
          return {
            ...item,
            // 只有當新數值大於 0 時才更新，否則保留舊值
            forwardPe: (market.forwardPe && market.forwardPe > 0) ? market.forwardPe : item.forwardPe,
            changePercent: (market.changePercent && market.changePercent !== 0) ? market.changePercent : item.changePercent,
            currentPrice: market.price || item.currentPrice,
            marketCap: (market.marketCap && market.marketCap !== 'N/A') ? market.marketCap : item.marketCap
          };
        }
        return item;
      });

      setPortfolio(updatedPortfolio);

      // Persist to Firestore so it doesn't disappear on reload
      if (user) {
        const portfolioRef = doc(db, "users", user.uid, "apps", APP_ID, "settings", "portfolio");
        await setDoc(portfolioRef, { items: updatedPortfolio, updatedAt: serverTimestamp() });
      }
    } catch (error) {
      console.error("Error refreshing market data:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublishToGlobal = async () => {
    if (userData?.role !== 'admin' || !user) return;
    
    setConfirmModal({
      show: true,
      title: t('publishGlobalTitle'),
      message: t('publishGlobalConfirm'),
      onConfirm: async () => {
        setIsUploading(true);
        try {
          const globalHoldingRef = doc(db, "apps", APP_ID, "global", "holding");
          
          const globalItems = portfolio.filter(p => p.quantity > 0).map(p => ({
            symbol: p.symbol,
            name: p.name || p.symbol,
            price: p.currentPrice,
            marketCap: p.marketCap || 'N/A',
            weight: (p.quantity * p.currentPrice * p.fxRateToUsd / totalValue * 100),
            upside: 0,
            forwardPe: p.forwardPe || 0,
            thesis: t('syncedFromDashboard'),
            category: 'holding'
          }));
          
          const publishData = {
            items: globalItems,
            updatedAt: serverTimestamp(),
            updatedBy: user.email
          };

          await setDoc(globalHoldingRef, publishData);
          
          alert(t('publishSuccess'));
        } catch (error) {
          console.error("Publish failed:", error);
        } finally {
          setIsUploading(false);
        }
      }
    });
  };

  const handleTestApi = async () => {
    if (!testSymbol) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data } = await fetchMarketData([testSymbol.toUpperCase()]);
      setTestResult(data[0]);
    } catch (error) {
      setTestResult({ error: String(error) });
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await syncUserRoleAndCredits(currentUser.uid, currentUser.email || "");
        setUserData(data);

        // Subscriptions for Sandbox Data
        const portfolioRef = doc(db, "users", currentUser.uid, "apps", APP_ID, "settings", "portfolio");
        const transactionsRef = collection(db, "users", currentUser.uid, "apps", APP_ID, "history");

        const unsubPortfolio = onSnapshot(portfolioRef, (doc) => {
          if (doc.exists()) {
            setPortfolio(doc.data().items || []);
          } else {
            setPortfolio([]);
          }
        });

        const unsubTransactions = onSnapshot(query(transactionsRef, orderBy("date", "desc"), limit(100)), (snap) => {
          const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
          setTransactions(txs);
        });

        // Automatic Refresh Logic
        const lastRefresh = localStorage.getItem(`last_refresh_${currentUser.uid}`);
        const today = new Date().toISOString().split('T')[0];
        if (lastRefresh !== today) {
          // We need to wait for portfolio to be loaded before refreshing
          // But onSnapshot is async. We'll use a timeout or a separate effect.
          // Better: just call it, it will use the current portfolio state which might be empty initially.
          // Actually, let's put it in a separate useEffect that depends on portfolio.length
          localStorage.setItem(`last_refresh_${currentUser.uid}`, today);
        }

        setAuthLoading(false);
        return () => {
          unsubPortfolio();
          unsubTransactions();
        };
      } else {
        setUser(null);
        setUserData(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && portfolio.length > 0) {
      const lastRefresh = localStorage.getItem(`last_refresh_executed_${user.uid}`);
      const today = new Date().toISOString().split('T')[0];
      if (lastRefresh !== today) {
        handleRefreshData(true);
        localStorage.setItem(`last_refresh_executed_${user.uid}`, today);
      }
    }
  }, [user, portfolio.length]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-mono animate-pulse">{t('analyzing')}</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center text-white shrink-0">
              <TrendingUp size={20} />
            </div>
            <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{t('appManager')}</h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1 bg-[#141414]/5 p-1 rounded-full">
              {[
                { id: 'dashboard', label: t('dashboard') },
                { id: 'wealth', label: t('portfolio') },
                { id: 'invest', label: t('planner') },
                { id: 'betterleaf', label: t('betterleaf') },
                { id: 'history', label: t('history') },
                { id: 'settings', label: t('settings') }
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    view === item.id ? "bg-white shadow-sm text-[#141414]" : "text-[#141414]/60 hover:text-[#141414]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-[#141414]/10">
              <div className="flex items-center gap-2 mr-2">
                <button 
                  onClick={() => handleRefreshData(false)}
                  disabled={isUploading}
                  className="p-2 hover:bg-[#141414]/5 text-[#141414]/60 hover:text-[#141414] rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
                  title={t('refreshData')}
                >
                  <RefreshCw size={16} className={cn(isUploading && "animate-spin")} />
                  <span className="hidden lg:inline">{t('refreshData')}</span>
                </button>
                {userData?.role === 'admin' && (
                  <button 
                    onClick={handlePublishToGlobal}
                    className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
                    title={t('publishGlobal')}
                  >
                    <Upload size={16} />
                    <span className="hidden lg:inline">{t('publishGlobal')}</span>
                  </button>
                )}
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  {userData?.role === 'vip' && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">VIP</span>}
                  {userData?.role === 'admin' && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded uppercase">Admin</span>}
                  <span className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t('credits')}: {userData?.credits}</span>
                </div>
                <span className="text-xs font-medium text-[#141414]">{user?.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 text-[#141414]/40 hover:text-red-600 rounded-xl transition-all"
                title={t('logout')}
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 hover:bg-[#141414]/5 rounded-xl transition-all"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden bg-white border-t border-[#141414]/10 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <nav className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'dashboard', label: t('dashboard'), icon: TrendingUp },
                    { id: 'wealth', label: t('portfolio'), icon: PieChartIcon },
                    { id: 'invest', label: t('planner'), icon: Target },
                    { id: 'betterleaf', label: t('betterleaf'), icon: Check },
                    { id: 'history', label: t('history'), icon: History },
                    { id: 'settings', label: t('settings'), icon: RefreshCw }
                  ].map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => {
                        setView(item.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-all",
                        view === item.id ? "bg-[#141414] text-white" : "bg-[#141414]/5 text-[#141414]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="font-bold">{item.label}</span>
                      </div>
                      <ChevronRight size={16} className={view === item.id ? "opacity-100" : "opacity-20"} />
                    </button>
                  ))}
                </nav>

                <div className="p-4 bg-[#141414]/5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t('account')}</span>
                      <span className="text-sm font-bold truncate max-w-[200px]">{user?.email}</span>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="p-2 bg-red-50 text-red-600 rounded-xl"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-[#141414]/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t('credits')}</span>
                    </div>
                    <span className="text-sm font-bold">{userData?.credits}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      handleRefreshData(false);
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isUploading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#141414] text-white rounded-2xl font-bold text-sm"
                  >
                    <RefreshCw size={16} className={cn(isUploading && "animate-spin")} />
                    {t('refreshData')}
                  </button>
                  {userData?.role === 'admin' && (
                    <button 
                      onClick={() => {
                        handlePublishToGlobal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm"
                    >
                      <Upload size={16} />
                      {t('publishGlobal')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {view === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column: Stats & Charts */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-[#141414]/5 shadow-sm"
                >
                  <p className="text-[9px] md:text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('totalWealth')}</p>
                  <p className="text-lg md:text-xl font-bold">{formatCurrency(totalValue, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-[#141414]/5 shadow-sm"
                >
                  <p className="text-[9px] md:text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('totalProfitLoss')}</p>
                  <div className="flex flex-col">
                    <p className={cn(
                      "text-lg md:text-xl font-bold",
                      riskMetrics.totalPl >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {riskMetrics.totalPl >= 0 ? '+' : ''}{formatCurrency(riskMetrics.totalPl, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                    </p>
                    <p className={cn(
                      "text-[10px] font-bold",
                      riskMetrics.totalPlPercent >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {riskMetrics.totalPlPercent >= 0 ? '+' : ''}{riskMetrics.totalPlPercent.toFixed(2)}%
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-[#141414]/5 shadow-sm"
                >
                  <p className="text-[9px] md:text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('wealthFreedomProgress')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-lg md:text-xl font-bold">{freedomProgress.toFixed(1)}%</p>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-br text-white text-[8px] font-bold",
                        currentMilestone.color
                      )}>
                        <currentMilestone.icon size={10} />
                        <span className="truncate max-w-[60px]">{currentMilestone.title}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#141414]/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${freedomProgress}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-[#141414]/5 shadow-sm"
                >
                  <p className="text-[9px] md:text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('monthlyInvestmentProgress')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-lg md:text-xl font-bold">{monthlyInvestmentProgress.toFixed(1)}%</p>
                      <p className="text-[9px] text-[#141414]/40 font-bold">
                        {formatCurrency(convert(monthlyInvestmentTotal), { maximumFractionDigits: 0 })} / {formatCurrency(monthlyContribution, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="h-1.5 bg-[#141414]/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${monthlyInvestmentProgress}%` }}
                        className="h-full bg-blue-500"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Allocation Chart */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-2">
                    {(selectedCategory || selectedAsset) && (
                      <button 
                        onClick={() => {
                          if (selectedAsset) setSelectedAsset(null);
                          else setSelectedCategory(null);
                        }}
                        className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors text-[#141414]/60 hover:text-[#141414]"
                        title="Back"
                      >
                        <ArrowDownRight className="rotate-135" size={18} />
                      </button>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <PieChartIcon size={20} />
                        {selectedAsset ? (
                          <span className="flex items-center gap-2">
                            <span className="text-[#141414]/40 font-normal">{t('asset')}:</span>
                            {selectedAsset}
                          </span>
                        ) : selectedCategory ? (
                          <span className="flex items-center gap-2">
                            <span className="text-[#141414]/40 font-normal">{chartDimension === 'assetType' ? t('type') : t(chartDimension)}:</span>
                            {selectedCategory}
                          </span>
                        ) : t('portfolioAllocation')}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-[#141414]/5 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {(['symbol', 'sector', 'country', 'assetType'] as const).map((dim) => (
                      <button
                        key={dim}
                        onClick={() => {
                          setChartDimension(dim);
                          setSelectedCategory(null);
                          setSelectedAsset(null);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                          chartDimension === dim ? "bg-white shadow-sm text-[#141414]" : "text-[#141414]/40 hover:text-[#141414]"
                        )}
                      >
                        {dim === 'symbol' ? t('assets') : dim === 'assetType' ? t('type') : t(dim)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  <div className="lg:col-span-3 h-[350px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            onClick={(data: any) => {
                              if (data.isAsset) {
                                setSelectedAsset(data.symbol);
                              } else if (!selectedCategory) {
                                setSelectedCategory(data.name);
                              }
                            }}
                            className={cn("outline-none", (!selectedCategory || !selectedAsset) && "cursor-pointer")}
                          >
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                                stroke={selectedCategory === entry.name ? '#141414' : 'none'}
                                strokeWidth={2}
                                className="transition-all duration-300"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const percentage = ((data.value / totalValue) * 100).toFixed(1);
                                return (
                                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-[#141414]/5">
                                    <p className="text-xs font-bold text-[#141414]/40 uppercase mb-1">{data.name}</p>
                                    <p className="text-lg font-bold text-[#141414]">
                                      {formatCurrency(data.value, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-sm font-medium text-emerald-600">
                                      {percentage}% {t('ofPortfolio')}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-[#141414]/30">
                        <PieChartIcon size={48} strokeWidth={1} className="mb-4" />
                        <p>{t('uploadScreenshotToSeeAllocation')}</p>
                      </div>
                    )}
                  </div>

                  {/* Holdings list inside the card */}
                  <div className="lg:col-span-2 flex flex-col justify-center">
                    <h4 className="text-xs font-bold uppercase text-[#141414]/40 mb-4">
                      {selectedAsset ? t('assetDetails') : selectedCategory ? t('holdingsIn', { category: selectedCategory }) : t('holdingsOverview')}
                    </h4>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedAsset ? (
                        // Asset Details View
                        (() => {
                          const asset = portfolio.find(p => p.symbol === selectedAsset);
                          if (!asset) return null;
                          const totalUsd = asset.quantity * asset.currentPrice * asset.fxRateToUsd;
                          const costUsd = asset.quantity * asset.averagePrice * asset.fxRateToUsd;
                          const pl = totalUsd - costUsd;
                          const plPercentage = costUsd > 0 ? (pl / costUsd) * 100 : 0;
                          
                          return (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-[#141414]/2 rounded-xl">
                                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('totalValue')}</p>
                                  <p className="text-sm font-bold">{formatCurrency(totalUsd)}</p>
                                </div>
                                <div className="p-3 bg-[#141414]/2 rounded-xl">
                                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('profitLoss')}</p>
                                  <p className={cn("text-sm font-bold", pl >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {formatCurrency(pl)} ({plPercentage.toFixed(1)}%)
                                  </p>
                                </div>
                                <div className="p-3 bg-[#141414]/2 rounded-xl">
                                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('quantity')}</p>
                                  <p className="text-sm font-bold">{asset.quantity.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-[#141414]/2 rounded-xl">
                                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('marketPrice')}</p>
                                  <p className="text-sm font-bold">{formatCurrency(asset.currentPrice)}</p>
                                </div>
                                <div className="p-3 bg-[#141414]/2 rounded-xl">
                                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('avgPrice')}</p>
                                  <p className="text-sm font-bold">{formatCurrency(asset.averagePrice)}</p>
                                </div>
                                <div className="p-3 bg-[#141414]/2 rounded-xl">
                                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('forwardPe')}</p>
                                  <p className="text-sm font-bold">{asset.forwardPe ? `${asset.forwardPe.toFixed(1)}x` : 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-[#141414]/2 rounded-xl">
                                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('dailyChange')}</p>
                                  <p className={cn(
                                    "text-sm font-bold",
                                    (asset.changePercent || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                                  )}>
                                    {(asset.changePercent || 0) >= 0 ? '+' : ''}{asset.changePercent?.toFixed(2)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        // List View (Categories or Assets)
                        chartData.map((item, idx) => (
                          <button 
                            key={item.name} 
                            onClick={() => {
                              if (item.isAsset) {
                                setSelectedAsset(item.symbol);
                              } else {
                                setSelectedCategory(item.name);
                              }
                            }}
                            className="w-full flex items-center justify-between p-3 bg-[#141414]/2 rounded-xl hover:bg-[#141414]/5 transition-colors text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <div>
                                <p className="text-sm font-bold group-hover:text-[#141414] transition-colors">
                                  {item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name}
                                </p>
                                <p className="text-[10px] text-[#141414]/40">{(item.value / totalValue * 100).toFixed(1)}% of total</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono font-bold">
                                {formatCurrency(item.value, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                              </p>
                              <ArrowDownRight className="-rotate-45 opacity-0 group-hover:opacity-100 transition-opacity" size={14} />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Actions & Upload */}
            <div className="space-y-8">
              {/* Upload Section */}
              <div className="bg-[#141414] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">{t('updatePortfolio')}</h3>
                  <p className="text-white/60 text-sm mb-6">{t('updatePortfolioDesc')}</p>
                  
                  <label className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-2xl p-8 cursor-pointer transition-all hover:border-white/40 hover:bg-white/5",
                    isUploading && "opacity-50 cursor-not-allowed"
                  )}>
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="text-sm font-medium">{t('analyzingImage')}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mb-4" size={32} />
                        <p className="text-sm font-medium">{t('clickDragPaste')}</p>
                        <p className="text-xs text-white/40 mt-1">{t('fileTypes')}</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                {/* Decorative element */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
              </div>

              {/* Confirmation Modal/Section */}
              <AnimatePresence>
                {extractedData && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-3xl border-2 border-[#141414] shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg">{t('confirmData')}</h4>
                      <button onClick={() => setExtractedData(null)} className="text-[#141414]/40 hover:text-[#141414]">
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {extractedData.type === 'PORTFOLIO' && (
                        <div className="flex items-center gap-2 p-1 bg-[#141414]/5 rounded-xl mb-4">
                          <button 
                            onClick={() => setUpdateMode('merge')}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                              updateMode === 'merge' ? "bg-white shadow-sm" : "text-[#141414]/40"
                            )}
                          >
                            {t('merge')}
                          </button>
                          <button 
                            onClick={() => setUpdateMode('replace')}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                              updateMode === 'replace' ? "bg-white shadow-sm" : "text-[#141414]/40"
                            )}
                          >
                            {t('replaceAll')}
                          </button>
                        </div>
                      )}

                      <p className="text-xs font-bold uppercase text-[#141414]/40">
                        {extractedData.type === 'PORTFOLIO' ? t('detectedHoldings') : t('detectedTrade')}
                      </p>
                      
                      {extractedData.items.map((item: any, i: number) => (
                        <div key={i} className="bg-[#141414]/5 p-4 rounded-xl relative group">
                          <button 
                            onClick={() => removeExtractedItem(i)}
                            className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('symbol')}</label>
                              <input 
                                className="w-full bg-transparent border-b border-[#141414]/10 font-bold outline-none"
                                value={item.symbol}
                                onChange={(e) => handleExtractedItemChange(i, 'symbol', e.target.value)}
                              />
                            </div>
                            {extractedData.type === 'TRADE' && (
                              <div className="col-span-2">
                                <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('tradeType')}</label>
                                <select 
                                  className="w-full bg-transparent border-b border-[#141414]/10 font-bold outline-none"
                                  value={item.tradeType}
                                  onChange={(e) => handleExtractedItemChange(i, 'tradeType', e.target.value)}
                                >
                                  <option value="BUY">BUY</option>
                                  <option value="SELL">SELL</option>
                                </select>
                              </div>
                            )}
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('quantity')}</label>
                              <input 
                                type="number"
                                className="w-full bg-transparent border-b border-[#141414]/10 font-mono outline-none"
                                value={item.quantity}
                                onChange={(e) => handleExtractedItemChange(i, 'quantity', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('price')}</label>
                              <input 
                                type="number"
                                className="w-full bg-transparent border-b border-[#141414]/10 font-mono outline-none"
                                value={item.price}
                                onChange={(e) => handleExtractedItemChange(i, 'price', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('currency')}</label>
                              <input 
                                className="w-full bg-transparent border-b border-[#141414]/10 font-bold outline-none"
                                value={item.currency}
                                onChange={(e) => handleExtractedItemChange(i, 'currency', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('fxRate')}</label>
                              <input 
                                type="number"
                                step="0.0001"
                                className="w-full bg-transparent border-b border-[#141414]/10 font-mono outline-none"
                                value={item.fxRateToUsd}
                                onChange={(e) => handleExtractedItemChange(i, 'fxRateToUsd', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('sector')}</label>
                              <input 
                                className="w-full bg-transparent border-b border-[#141414]/10 font-bold outline-none text-xs"
                                value={item.sector}
                                onChange={(e) => handleExtractedItemChange(i, 'sector', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('country')}</label>
                              <input 
                                className="w-full bg-transparent border-b border-[#141414]/10 font-bold outline-none text-xs"
                                value={item.country}
                                onChange={(e) => handleExtractedItemChange(i, 'country', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('assetType')}</label>
                              <select 
                                className="w-full bg-transparent border-b border-[#141414]/10 font-bold outline-none text-xs"
                                value={item.assetType}
                                onChange={(e) => handleExtractedItemChange(i, 'assetType', e.target.value)}
                              >
                                <option value="Stock">{t('stock')}</option>
                                <option value="ETF">{t('etf')}</option>
                                <option value="Fund">{t('fund')}</option>
                                <option value="Crypto">{t('crypto')}</option>
                                <option value="Bond">{t('bond')}</option>
                                <option value="Others">{t('others')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('fwdPe')}</label>
                              <input 
                                type="number"
                                className="w-full bg-transparent border-b border-[#141414]/10 font-mono outline-none"
                                value={item.forwardPe}
                                onChange={(e) => handleExtractedItemChange(i, 'forwardPe', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#141414]/40 uppercase font-bold">{t('dailyChange')}</label>
                              <input 
                                type="number"
                                step="0.01"
                                className="w-full bg-transparent border-b border-[#141414]/10 font-mono outline-none"
                                value={item.changePercent}
                                onChange={(e) => handleExtractedItemChange(i, 'changePercent', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={confirmExtraction}
                        className="flex-1 bg-[#141414] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#141414]/90 transition-colors"
                      >
                        <Check size={18} />
                        {t('confirm')}
                      </button>
                      <button 
                        onClick={() => setExtractedData(null)}
                        className="flex-1 border border-[#141414]/10 py-3 rounded-xl font-bold hover:bg-[#141414]/5 transition-colors"
                      >
                        {t('cancelEdit')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm">
                <h3 className="font-bold mb-4">{t('quickActions')}</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setConfirmModal({
                        show: true,
                        title: t('resetPortfolioTitle'),
                        message: t('resetPortfolioMsg'),
                        onConfirm: async () => {
                          setPortfolio([]);
                          setTransactions([]);
                          if (user) {
                            const portfolioRef = doc(db, "users", user.uid, "apps", APP_ID, "settings", "portfolio");
                            await setDoc(portfolioRef, { items: [], updatedAt: serverTimestamp() });
                            // History is harder to clear fully without a batch delete, but we can at least clear portfolio
                          }
                        }
                      });
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-[#141414]/5 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-all group"
                  >
                    <span className="font-medium">{t('resetPortfolio')}</span>
                    <Trash2 size={18} className="text-[#141414]/20 group-hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Current Holdings Table - Full Width */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl border border-[#141414]/5 shadow-sm overflow-hidden mt-8"
          >
            <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {t('currentHoldings')}
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-30 bg-white">
                  <tr className="bg-[#141414]/[0.01]">
                    <th 
                      className="px-1 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 cursor-pointer hover:text-[#141414] transition-colors sticky left-0 z-40 bg-white min-w-[55px] md:min-w-[240px]"
                      onClick={() => requestSort('symbol')}
                    >
                      {t('asset')} {sortConfig?.key === 'symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 cursor-pointer hover:text-[#141414] transition-colors"
                      onClick={() => requestSort('quantity')}
                    >
                      {t('quantity')} {sortConfig?.key === 'quantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 cursor-pointer hover:text-[#141414] transition-colors"
                      onClick={() => requestSort('averagePrice')}
                    >
                      {t('avgPrice')} {sortConfig?.key === 'averagePrice' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 cursor-pointer hover:text-[#141414] transition-colors"
                      onClick={() => requestSort('currentPrice')}
                    >
                      {t('marketPrice')} {sortConfig?.key === 'currentPrice' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 cursor-pointer hover:text-[#141414] transition-colors"
                      onClick={() => requestSort('pl')}
                    >
                      {t('profitLoss')} {sortConfig?.key === 'pl' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 cursor-pointer hover:text-[#141414] transition-colors"
                      onClick={() => requestSort('forwardPe')}
                    >
                      {t('fwdPe')} {sortConfig?.key === 'forwardPe' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 cursor-pointer hover:text-[#141414] transition-colors"
                      onClick={() => requestSort('changePercent')}
                    >
                      {t('dailyChange')} {sortConfig?.key === 'changePercent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 text-right cursor-pointer hover:text-[#141414] transition-colors"
                      onClick={() => requestSort('totalUsd')}
                    >
                      {t('totalUsd')} {sortConfig?.key === 'totalUsd' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 md:px-6 py-2 md:py-3 border-b border-[#141414]/10 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/5">
                  {sortedPortfolio.map((item, idx) => (
                    <tr key={item.symbol} className="hover:bg-[#141414]/[0.02] transition-colors group">
                      <td className="px-1 md:px-6 py-3 md:py-4 sticky left-0 z-20 bg-white group-hover:bg-[#F5F5F0] transition-colors border-r border-[#141414]/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[55px] md:w-[240px]">
                        <div className="flex items-center gap-1 md:gap-3">
                          <div 
                            className="w-1 md:w-2 h-5 md:h-8 rounded-full shrink-0" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <div className="min-w-0 flex-1">
                            {editingItem?.id === item.symbol && editingItem.type === 'portfolio' ? (
                              <input 
                                className="font-bold bg-transparent border-b border-[#141414] outline-none w-full"
                                defaultValue={item.symbol}
                                onBlur={(e) => updatePortfolioItem(item.symbol, { symbol: e.target.value })}
                              />
                            ) : (
                              <p className="font-bold text-[10px] md:text-sm truncate">{item.symbol}</p>
                            )}
                            <div className="hidden md:flex items-center gap-1 overflow-hidden">
                              <span className="text-[10px] md:text-xs text-[#141414]/40 truncate">
                                {item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm">
                        {editingItem?.id === item.symbol && editingItem.type === 'portfolio' ? (
                          <input 
                            type="number"
                            className="bg-transparent border-b border-[#141414] outline-none w-16"
                            defaultValue={item.quantity}
                            onBlur={(e) => updatePortfolioItem(item.symbol, { quantity: Number(e.target.value) })}
                          />
                        ) : (
                          item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm">
                        {editingItem?.id === item.symbol && editingItem.type === 'portfolio' ? (
                          <div className="flex flex-col">
                            <input 
                              type="number"
                              className="bg-transparent border-b border-[#141414] outline-none w-20"
                              defaultValue={item.averagePrice}
                              onBlur={(e) => updatePortfolioItem(item.symbol, { averagePrice: Number(e.target.value) })}
                            />
                            <input 
                              type="number"
                              step="0.0001"
                              className="text-[10px] bg-transparent border-b border-[#141414] outline-none w-20 text-[#141414]/40"
                              defaultValue={item.fxRateToUsd}
                              onBlur={(e) => updatePortfolioItem(item.symbol, { fxRateToUsd: Number(e.target.value) })}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span>{item.currency} {item.averagePrice.toFixed(2)}</span>
                            <span className="text-[10px] text-[#141414]/40">FX: {item.fxRateToUsd.toFixed(4)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm">
                        {item.currency} {item.currentPrice.toFixed(2)}
                      </td>
                      <td className={cn(
                        "px-3 md:px-6 py-4 font-mono text-xs md:text-sm font-bold",
                        item.pl >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        <div className="flex flex-col">
                          <span>{item.pl >= 0 ? '+' : '-'}${Math.abs(item.pl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[10px] opacity-70">{item.plPercentage >= 0 ? '+' : ''}{item.plPercentage.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm">
                        {editingItem?.id === item.symbol && editingItem.type === 'portfolio' ? (
                          <input 
                            type="number"
                            className="bg-transparent border-b border-[#141414] outline-none w-12"
                            defaultValue={item.forwardPe}
                            onBlur={(e) => updatePortfolioItem(item.symbol, { forwardPe: Number(e.target.value) })}
                          />
                        ) : (
                          item.forwardPe ? item.forwardPe.toFixed(1) : '-'
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm">
                        {editingItem?.id === item.symbol && editingItem.type === 'portfolio' ? (
                          <div className="flex flex-col">
                            <input 
                              type="number"
                              step="0.01"
                              className="bg-transparent border-b border-[#141414] outline-none w-12"
                              defaultValue={item.changePercent}
                              onBlur={(e) => updatePortfolioItem(item.symbol, { changePercent: Number(e.target.value) })}
                            />
                            <span className={cn(
                              "text-[10px]",
                              (item.changePercent || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                              {formatCurrency((item.changePercent || 0) / 100 * item.quantity * item.currentPrice * item.fxRateToUsd, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-bold",
                              (item.changePercent || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                              {(item.changePercent || 0) >= 0 ? '+' : ''}{item.changePercent ? item.changePercent.toFixed(2) : '0.00'}%
                            </span>
                            <span className={cn(
                              "text-[10px]",
                              (item.changePercent || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                              {formatCurrency((item.changePercent || 0) / 100 * item.quantity * item.currentPrice * item.fxRateToUsd, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm text-right">
                        <span className="font-bold">
                          {formatCurrency(item.totalUsd)}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingItem(editingItem?.id === item.symbol ? null : { type: 'portfolio', id: item.symbol })}
                            className="p-1 hover:bg-[#141414]/5 rounded text-[#141414]/40 hover:text-[#141414]"
                            title={t('editData')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => deletePortfolioItem(item.symbol)}
                            className="p-1 hover:bg-red-50 rounded text-[#141414]/40 hover:text-red-500"
                            title={t('removeAsset')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedPortfolio.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-[#141414]/30">
                        {t('noHoldings')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
          </>
        ) : view === 'wealth' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WealthProgressBar 
              currentPortfolioValue={totalValue} 
              monthlyContribution={monthlyContribution}
              onMonthlyContributionChange={setMonthlyContribution}
              credits={userData?.credits || 0}
              onDeductCredits={async () => {
                if (userData && userData.role !== 'admin' && user) {
                  const success = await deductCredits(user.uid);
                  if (success) {
                    setUserData(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
                  } else {
                    setShowUpsell(true);
                    throw new Error("Insufficient credits");
                  }
                }
              }}
              role={userData?.role}
            />
          </motion.div>
        ) : view === 'invest' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <InvestmentPlanner 
              monthlyContribution={monthlyContribution}
              onMonthlyContributionChange={setMonthlyContribution}
              userData={userData}
              setUserData={setUserData}
              user={user}
              setShowUpsell={setShowUpsell}
              plannerState={plannerState}
              setPlannerState={setPlannerState}
            />
          </motion.div>
        ) : view === 'betterleaf' ? (
          <BetterleafPortfolio role={userData?.role} />
        ) : view === 'history' ? (
          /* History View */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl border border-[#141414]/5 shadow-sm overflow-hidden"
          >
            <div className="p-8 border-b border-[#141414]/5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold tracking-tight">{t('transactionHistory')}</h3>
                <p className="text-[#141414]/50">{t('transactionHistoryDesc')}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#141414]/5 text-[#141414]/50 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-8 py-4">{t('date')}</th>
                    <th className="px-8 py-4">{t('type')}</th>
                    <th className="px-8 py-4">{t('asset')}</th>
                    <th className="px-8 py-4">{t('quantity')}</th>
                    <th className="px-8 py-4">{t('price')}</th>
                    <th className="px-8 py-4 text-right">{t('total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/5">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#141414]/2 transition-colors group">
                      <td className="px-8 py-6 text-sm text-[#141414]/60">
                        {editingItem?.id === tx.id && editingItem.type === 'history' ? (
                          <div className="flex flex-col gap-1">
                            <input 
                              type="date"
                              className="bg-transparent border-b border-[#141414] outline-none"
                              defaultValue={tx.date}
                              onBlur={(e) => updateTransaction(tx.id, { date: e.target.value })}
                            />
                            <input 
                              className="text-[10px] bg-transparent border-b border-[#141414] outline-none w-10"
                              defaultValue={tx.currency}
                              onBlur={(e) => updateTransaction(tx.id, { currency: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span>{tx.date}</span>
                            <span className="text-[10px] font-bold text-[#141414]/40">{tx.currency}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {editingItem?.id === tx.id && editingItem.type === 'history' ? (
                          <select 
                            className="bg-transparent border-b border-[#141414] outline-none text-xs font-bold"
                            defaultValue={tx.type}
                            onBlur={(e) => updateTransaction(tx.id, { type: e.target.value as any })}
                          >
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                            <option value="HOLDING_UPDATE">UPDATE</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            tx.type === 'BUY' ? "bg-emerald-100 text-emerald-700" : 
                            tx.type === 'SELL' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {tx.type}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 font-bold">
                        {editingItem?.id === tx.id && editingItem.type === 'history' ? (
                          <input 
                            className="bg-transparent border-b border-[#141414] outline-none w-20"
                            defaultValue={tx.symbol}
                            onBlur={(e) => updateTransaction(tx.id, { symbol: e.target.value })}
                          />
                        ) : (
                          tx.symbol
                        )}
                      </td>
                      <td className="px-8 py-6 font-mono text-sm">
                        {editingItem?.id === tx.id && editingItem.type === 'history' ? (
                          <input 
                            type="number"
                            className="bg-transparent border-b border-[#141414] outline-none w-16"
                            defaultValue={tx.quantity}
                            onBlur={(e) => updateTransaction(tx.id, { quantity: Number(e.target.value) })}
                          />
                        ) : (
                          tx.quantity || '-'
                        )}
                      </td>
                      <td className="px-8 py-6 font-mono text-sm">
                        {editingItem?.id === tx.id && editingItem.type === 'history' ? (
                          <div className="flex flex-col gap-1">
                            <input 
                              type="number"
                              className="bg-transparent border-b border-[#141414] outline-none w-20"
                              defaultValue={tx.price}
                              onBlur={(e) => updateTransaction(tx.id, { price: Number(e.target.value) })}
                            />
                            <input 
                              type="number"
                              step="0.0001"
                              className="text-[10px] bg-transparent border-b border-[#141414] outline-none w-20 text-[#141414]/40"
                              defaultValue={tx.fxRateToUsd}
                              onBlur={(e) => updateTransaction(tx.id, { fxRateToUsd: Number(e.target.value) })}
                            />
                          </div>
                        ) : (
                          tx.price ? (
                            <div className="flex flex-col">
                              <span>{tx.currency} {tx.price.toFixed(2)}</span>
                              <span className="text-[10px] text-[#141414]/40">FX: {tx.fxRateToUsd.toFixed(4)}</span>
                            </div>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <span className="font-bold">
                            {tx.total ? formatCurrency(tx.total) : '-'}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingItem(editingItem?.id === tx.id ? null : { type: 'history', id: tx.id })}
                              className="p-1 hover:bg-[#141414]/5 rounded text-[#141414]/40 hover:text-[#141414]"
                            >
                              <Plus size={14} className="rotate-45" />
                            </button>
                            <button 
                              onClick={() => deleteTransaction(tx.id)}
                              className="p-1 hover:bg-red-50 rounded text-[#141414]/40 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-[#141414]/30">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}

        {view === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
              <h2 className="text-2xl font-bold mb-8">{t('settings')}</h2>
              
              <div className="space-y-8">
                {/* Currency Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#141414]/40 uppercase text-[10px] font-bold tracking-widest">
                    <RefreshCw size={14} />
                    {t('currency')}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setCurrency(c.code)}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-2xl border transition-all",
                          currency === c.code 
                            ? "border-[#141414] bg-[#141414] text-white" 
                            : "border-[#141414]/5 hover:border-[#141414]/20 hover:bg-[#141414]/5"
                        )}
                      >
                        <span className="text-lg font-bold">{c.code}</span>
                        <span className={cn(
                          "text-xs",
                          currency === c.code ? "text-white/60" : "text-[#141414]/40"
                        )}>
                          {c.name[language]} ({c.symbol})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Selection */}
                <div className="space-y-4 pt-8 border-t border-[#141414]/5">
                  <div className="flex items-center gap-2 text-[#141414]/40 uppercase text-[10px] font-bold tracking-widest">
                    <LogOut className="rotate-90" size={14} />
                    {t('language')}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['zh-TW', 'zh-CN', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={cn(
                          "p-4 rounded-2xl border font-bold transition-all text-center",
                          language === lang 
                            ? "border-[#141414] bg-[#141414] text-white" 
                            : "border-[#141414]/5 hover:border-[#141414]/20 hover:bg-[#141414]/5"
                        )}
                      >
                        {lang === 'zh-TW' ? '繁體中文' : lang === 'zh-CN' ? '简体中文' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Info */}
                <div className="pt-8 border-t border-[#141414]/5">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#141414]/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">Account</span>
                      <span className="font-bold">{user?.email}</span>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                    >
                      {t('logout')}
                    </button>
                  </div>
                </div>

                {/* API Tester */}
                <div className="pt-8 border-t border-[#141414]/5">
                  <ApiTester />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 text-center text-[#141414]/30 text-xs">
        <p>© 2026 Visual Portfolio Manager • Powered by Gemini AI</p>
      </footer>

      {/* Upsell Modal */}
      <AnimatePresence>
        {showUpsell && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#141414]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-amber-200"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <TrendingUp className="text-amber-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-center mb-4">{t('quotaExceeded')}</h2>
              <p className="text-[#141414]/60 text-center mb-8 leading-relaxed">
                {userData?.role === 'student' ? t('studentUpsell') : t('trialUpsell')}
              </p>
              <div className="space-y-3">
                <a 
                  href={getUpsellLink(userData?.role)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-4 bg-amber-500 hover:bg-amber-600 text-white text-center rounded-2xl font-bold transition-all shadow-lg shadow-amber-500/20"
                >
                  {t('upgradeNow')}
                </a>
                <button 
                  onClick={() => setShowUpsell(false)}
                  className="block w-full py-4 bg-[#141414]/5 hover:bg-[#141414]/10 text-[#141414]/60 text-center rounded-2xl font-bold transition-all"
                >
                  {t('maybeLater')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#141414]/5"
            >
              <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
              <p className="text-[#141414]/60 mb-8">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-6 py-3 rounded-2xl bg-[#141414]/5 hover:bg-[#141414]/10 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                  }}
                  className="flex-1 px-6 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-bold transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
