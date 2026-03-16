import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Target, 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Info,
  Shield,
  Zap,
  Activity,
  Table as TableIcon,
  Edit2,
  Save,
  Plus,
  Trash2,
  X
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
  AreaChart,
  BarChart,
  Bar,
  Cell,
  ReferenceArea,
  ReferenceLine,
  Label
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import LZString from 'lz-string';
import { db } from '../services/firebase';
import { APP_ID } from '../services/authService';
import { fetchMarketData, getAIProjectionParams } from '../services/geminiService';
import { UserData, deductCredits } from '../services/authService';
import { User } from 'firebase/auth';
import { Lock, ExternalLink } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { useCurrency, SUPPORTED_CURRENCIES } from '../services/currencyService';

interface Allocation {
  symbol: string;
  weight: number;
  name?: string;
  forwardPe?: number;
}

interface RiskProfile {
  id: 'conservative' | 'moderate' | 'aggressive' | 'custom';
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  allocations: Allocation[];
}

const RISK_PROFILES: RiskProfile[] = [
  {
    id: 'conservative',
    name: 'conservative',
    description: 'conservativeDesc',
    icon: Shield,
    color: 'text-blue-600',
    allocations: [
      { symbol: 'VOO', weight: 0.30, name: 'Vanguard S&P 500 ETF' },
      { symbol: 'BND', weight: 0.40, name: 'Vanguard Total Bond Market ETF' },
      { symbol: 'GLD', weight: 0.10, name: 'SPDR Gold Shares' },
      { symbol: 'VTI', weight: 0.20, name: 'Vanguard Total Stock Market ETF' },
    ]
  },
  {
    id: 'moderate',
    name: 'moderate',
    description: 'moderateDesc',
    icon: Activity,
    color: 'text-emerald-600',
    allocations: [
      { symbol: 'VOO', weight: 0.40, name: 'Vanguard S&P 500 ETF' },
      { symbol: 'META', weight: 0.10, name: 'Meta Platforms' },
      { symbol: 'GOOGL', weight: 0.10, name: 'Alphabet Inc.' },
      { symbol: 'MSFT', weight: 0.10, name: 'Microsoft' },
      { symbol: 'NVDA', weight: 0.10, name: 'NVIDIA' },
      { symbol: 'AAPL', weight: 0.10, name: 'Apple' },
      { symbol: 'AMZN', weight: 0.10, name: 'Amazon' },
    ]
  },
  {
    id: 'aggressive',
    name: 'aggressive',
    description: 'aggressiveDesc',
    icon: Zap,
    color: 'text-amber-600',
    allocations: [
      { symbol: 'QQQ', weight: 0.40, name: 'Invesco QQQ Trust' },
      { symbol: 'TQQQ', weight: 0.20, name: 'ProShares UltraPro QQQ' },
      { symbol: 'NVDA', weight: 0.20, name: 'NVIDIA' },
      { symbol: 'TSLA', weight: 0.20, name: 'Tesla' },
    ]
  },
  {
    id: 'custom',
    name: 'custom',
    description: 'customDesc',
    icon: PieChartIcon,
    color: 'text-indigo-600',
    allocations: []
  }
];

interface InvestmentPlannerProps {
  monthlyContribution: number;
  onMonthlyContributionChange: (val: number) => void;
  userData: UserData | null;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  user: User | null;
  setShowUpsell: (show: boolean) => void;
  plannerState: any;
  setPlannerState: React.Dispatch<React.SetStateAction<any>>;
}

export const InvestmentPlanner: React.FC<InvestmentPlannerProps> = ({ 
  monthlyContribution, 
  onMonthlyContributionChange,
  userData,
  setUserData,
  user,
  setShowUpsell,
  plannerState,
  setPlannerState
}) => {
  const { t } = useLanguage();
  const { formatCurrency, formatLocal, convert, currency, rates } = useCurrency();
  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0];
  const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>(RISK_PROFILES);
  const [isEditingProfiles, setIsEditingProfiles] = useState(false);
  const [editingProfiles, setEditingProfiles] = useState<RiskProfile[]>([]);

  const [lumpSum, setLumpSum] = useState(0);
  const [riskId, setRiskId] = useState<'conservative' | 'moderate' | 'aggressive' | 'custom'>('moderate');
  const [customAllocations, setCustomAllocations] = useState<Allocation[]>([
    { symbol: 'VOO', weight: 0.50 },
    { symbol: 'QQQ', weight: 0.50 }
  ]);
  const [appliedCustomAllocations, setAppliedCustomAllocations] = useState<Allocation[]>([]);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [allData, setAllData] = useState<{dateMap: Record<string, any>, sortedDates: string[]} | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'1Y' | '5Y' | '10Y' | 'YTD' | 'MAX'>('10Y');
  const [isLoading, setIsLoading] = useState(false);
  const [annualReturns, setAnnualReturns] = useState<any[]>([]);
  const [isProjected, setIsProjected] = useState(false);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [projectedAnnualReturns, setProjectedAnnualReturns] = useState<any[]>([]);
  const [isProjecting, setIsProjecting] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [marketSentiment, setMarketSentiment] = useState<string | null>(null);
  const [isBacktested, setIsBacktested] = useState(false);
  const stateParamsKey = useRef<string | null>(null);

  const currentProfile = useMemo(() => {
    const profile = riskProfiles.find(p => p.id === riskId)!;
    if (riskId === 'custom') {
      return { ...profile, allocations: customAllocations };
    }
    return profile;
  }, [riskId, customAllocations, riskProfiles]);

  const activeAllocations = useMemo(() => {
    return riskId === 'custom' ? appliedCustomAllocations : currentProfile.allocations;
  }, [riskId, appliedCustomAllocations, currentProfile.allocations]);

  const totalInvestment = monthlyContribution + lumpSum;

  const currentParamsKey = useMemo(() => JSON.stringify({
    allocations: currentProfile.allocations,
    totalInvestment
  }), [currentProfile.allocations, totalInvestment]);

  // Load projection from localStorage
  useEffect(() => {
    if (user?.uid) {
      const saved = localStorage.getItem(`ai_projection_${user.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.params === currentParamsKey) {
            setProjectionData(parsed.projectionData || []);
            setProjectedAnnualReturns(parsed.projectedAnnualReturns || []);
            setAiReasoning(parsed.aiReasoning || null);
            setMarketSentiment(parsed.marketSentiment || null);
            setIsProjected(parsed.isProjected || false);
            stateParamsKey.current = parsed.params;
          }
        } catch (e) {
          console.error("Failed to load projection from localStorage", e);
        }
      }
    }
  }, [user?.uid, currentParamsKey]);

  // Save projection to localStorage
  useEffect(() => {
    if (user?.uid && isProjected && stateParamsKey.current === currentParamsKey) {
      const dataToSave = {
        params: currentParamsKey,
        isProjected,
        projectionData,
        projectedAnnualReturns,
        aiReasoning,
        marketSentiment
      };
      localStorage.setItem(`ai_projection_${user.uid}`, JSON.stringify(dataToSave));
    }
  }, [isProjected, projectionData, projectedAnnualReturns, aiReasoning, marketSentiment, user?.uid, currentParamsKey]);

  // Reset projection ONLY when parameters actually change
  useEffect(() => {
    if (stateParamsKey.current && stateParamsKey.current !== currentParamsKey) {
      setIsProjected(false);
      setProjectionData([]);
      setProjectedAnnualReturns([]);
      stateParamsKey.current = null;
      if (user?.uid) {
        localStorage.removeItem(`ai_projection_${user.uid}`);
      }
    }
  }, [currentParamsKey, user?.uid]);

  const totalCustomWeight = useMemo(() => {
    return customAllocations.reduce((sum, a) => sum + a.weight, 0);
  }, [customAllocations]);

  const isWeightValid = useMemo(() => {
    if (riskId !== 'custom') return true;
    return Math.abs(totalCustomWeight - 1) < 0.001;
  }, [riskId, totalCustomWeight]);

  // Load Risk Profiles from Firestore
  useEffect(() => {
    const ids: ('conservative' | 'moderate' | 'aggressive')[] = ['conservative', 'moderate', 'aggressive'];
    const unsubscribes = ids.map(id => {
      const profileRef = doc(db, "Planner", id, "Data", "allocation");
      return onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.allocations) {
            setRiskProfiles(prev => prev.map(p => 
              p.id === id ? { ...p, allocations: data.allocations } : p
            ));
          }
        }
      }, (error) => {
        console.error(`Firestore Error loading ${id} profile:`, error);
      });
    });
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const syncTickerName = async (pIdx: number, aIdx: number, symbol: string) => {
    if (!symbol) return;
    try {
      const res = await fetchMarketData([symbol]);
      if (res.data && res.data.length > 0) {
        const mData = res.data[0];
        const newProfiles = [...editingProfiles];
        const newAllocations = [...newProfiles[pIdx].allocations];
        newAllocations[aIdx] = { 
          ...newAllocations[aIdx], 
          name: mData.name 
        };
        newProfiles[pIdx] = { ...newProfiles[pIdx], allocations: newAllocations };
        setEditingProfiles(newProfiles);
      }
    } catch (error) {
      console.error("Error syncing ticker name:", error);
    }
  };

  const handleSaveProfiles = async () => {
    if (userData?.role !== 'admin') return;
    setIsLoading(true);
    try {
      // Final sync of all names to be sure
      const allSymbols = Array.from(new Set(editingProfiles.flatMap(p => p.allocations.map(a => a.symbol))));
      const marketDataRes = await fetchMarketData(allSymbols);
      
      const syncedProfiles = editingProfiles.map(p => ({
        ...p,
        allocations: p.allocations.map(a => {
          const mData = marketDataRes.data.find((d: any) => d.symbol === a.symbol);
          return {
            ...a,
            name: mData?.name || a.name
          };
        })
      }));

      // Save each profile to its own document
      await Promise.all(syncedProfiles.map(async (p) => {
        if (p.id === 'custom') return;
        const profileRef = doc(db, "Planner", p.id, "Data", "allocation");
        await setDoc(profileRef, {
          id: p.id,
          allocations: p.allocations,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email
        });
      }));

      setIsEditingProfiles(false);
    } catch (error) {
      console.error("Failed to save risk profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load custom allocations from Firestore
  useEffect(() => {
    if (user?.uid) {
      const customRef = doc(db, "users", user.uid, "Planner", "Custom");
      getDoc(customRef).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.allocations) {
            setCustomAllocations(data.allocations);
            setAppliedCustomAllocations(data.allocations);
          }
        }
      });
    }
  }, [user?.uid]);

  // Save custom allocations when they change
  useEffect(() => {
    if (user?.uid && riskId === 'custom') {
      const customRef = doc(db, "users", user.uid, "Planner", "Custom");
      setDoc(customRef, { allocations: customAllocations }, { merge: true });
    }
  }, [customAllocations, user?.uid, riskId]);

  // Fetch market data and historical data with cache
  useEffect(() => {
    const symbols = activeAllocations.map(a => a.symbol);
    
    if (symbols.length === 0) {
      setMarketData([]);
      setAllData(null);
      setIsBacktested(false);
      return;
    }
    
    // SPY is always needed for benchmark
    const allSymbols = [...symbols, 'SPY'];

    const fetchAndCache = async () => {
      setIsLoading(true);
      console.log(`[Planner] Processing riskId: ${riskId}`);
      const today = new Date().toISOString().split('T')[0];
      const cacheRef = riskId === 'custom' 
        ? doc(db, "users", user?.uid || "anon", "Planner", "Custom_History")
        : doc(db, "Planner", riskId, "Data", "graph_data");

      try {
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
          const cacheData = cacheSnap.data();
          // Check if today and if symbols match
          const cacheSymbols = cacheData.symbols || [];
          const symbolsMatch = JSON.stringify([...cacheSymbols].sort()) === JSON.stringify([...symbols].sort());
          
          if (cacheData.updatedAt === today && symbolsMatch) {
            console.log(`Using cached data for ${riskId}`);
            setMarketData(cacheData.marketData);
            
            // Handle decompression if data is compressed
            let parsedAllData;
            if (typeof cacheData.allData === 'string') {
              // Try decompressing first, if it fails or returns null, try normal JSON parse
              const decompressed = LZString.decompressFromUTF16(cacheData.allData);
              if (decompressed) {
                parsedAllData = JSON.parse(decompressed);
              } else {
                parsedAllData = JSON.parse(cacheData.allData);
              }
            } else {
              parsedAllData = cacheData.allData;
            }
            
            setAllData(parsedAllData);
            setIsBacktested(true);
            setIsLoading(false);
            return;
          }
        }

        console.log(`Fetching new data for ${riskId}...`);
        console.log(`[API] Fetching historical data for: ${allSymbols.join(',')}`);
        // Fetch new data
        const [marketRes, historicalRes] = await Promise.all([
          fetchMarketData(symbols),
          fetch(`/api/historical-data?symbols=${allSymbols.join(',')}&period=max`).then(r => {
            if (r.ok) console.log("[API] Historical data received successfully");
            return r.json();
          })
        ]);

        if (marketRes.data && Array.isArray(historicalRes)) {
          // Process historical data
          const dateMap: Record<string, any> = {};
          historicalRes.forEach((item: any) => {
            if (item.data && Array.isArray(item.data)) {
              item.data.forEach((d: any) => {
                const date = new Date(d.date).toISOString().split('T')[0];
                if (!dateMap[date]) dateMap[date] = { date };
                dateMap[date][item.symbol] = d.adjClose || d.close;
              });
            }
          });

          const sortedDates = Object.keys(dateMap)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .filter(date => allSymbols.every(s => dateMap[date][s] !== undefined));

          if (sortedDates.length > 0) {
            const newAllData = { dateMap, sortedDates };
            
            setMarketData(marketRes.data);
            setAllData(newAllData);
            setIsBacktested(true);

            // Update cache
            if (riskId !== 'custom') {
              console.log(`Attempting to update cache at: ${cacheRef.path}`);
              const compressedData = LZString.compressToUTF16(JSON.stringify(newAllData));
              
              await setDoc(cacheRef, {
                marketData: marketRes.data,
                allData: compressedData, // Compressed string to avoid size and index limits
                symbols: symbols,
                updatedAt: today,
                timestamp: serverTimestamp()
              }, { merge: true })
              .then(() => console.log(`Cache for ${riskId} updated successfully`))
              .catch(err => console.error(`Cache for ${riskId} update failed:`, err));
            }
          }
        }
      } catch (err) {
        console.error("Error in fetchAndCache:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndCache();
  }, [activeAllocations, riskId, user?.uid]);

  // Handle isBacktested state when editing custom allocations
  useEffect(() => {
    if (riskId === 'custom') {
      // Use a more robust comparison for allocations
      const normalize = (allocs: Allocation[]) => 
        JSON.stringify(allocs.map(a => ({ symbol: a.symbol, weight: Number(a.weight.toFixed(4)) })));
      
      const isSame = normalize(customAllocations) === normalize(appliedCustomAllocations);
      
      if (!isSame && isBacktested) {
        setIsBacktested(false);
      } else if (isSame && appliedCustomAllocations.length > 0 && !isBacktested && !isLoading) {
        setIsBacktested(true);
      }
    }
  }, [customAllocations, appliedCustomAllocations, riskId, isBacktested, isLoading]);

  // Process data based on timeRange
  useEffect(() => {
    if (!allData || !isWeightValid) {
      setHistoricalData([]);
      setAnnualReturns([]);
      return;
    }
    const { dateMap, sortedDates } = allData;
    const now = new Date('2026-03-05');
    
    let filteredDates = [...sortedDates];
    if (timeRange === '1Y') {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      filteredDates = sortedDates.filter(d => new Date(d) >= oneYearAgo);
    } else if (timeRange === '5Y') {
      const fiveYearsAgo = new Date(now);
      fiveYearsAgo.setFullYear(now.getFullYear() - 5);
      filteredDates = sortedDates.filter(d => new Date(d) >= fiveYearsAgo);
    } else if (timeRange === '10Y') {
      const tenYearsAgo = new Date(now);
      tenYearsAgo.setFullYear(now.getFullYear() - 10);
      filteredDates = sortedDates.filter(d => new Date(d) >= tenYearsAgo);
    } else if (timeRange === 'YTD') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredDates = sortedDates.filter(d => new Date(d) >= startOfYear);
    }

    if (filteredDates.length === 0) {
      setHistoricalData([]);
      setAnnualReturns([]);
      return;
    }

    const startBalance = totalInvestment;
    const symbols = [...activeAllocations.map(a => a.symbol), 'SPY'];
    if (symbols.length <= 1) {
      setHistoricalData([]);
      setAnnualReturns([]);
      return;
    }

    // Rebalanced Portfolio Calculation
    let lastYear = '';
    let assetValues: Record<string, number> = {};
    activeAllocations.forEach(alloc => {
      assetValues[alloc.symbol] = startBalance * alloc.weight;
    });
    let currentBenchmarkValue = startBalance;

    const chartPoints = filteredDates.map((date, index) => {
      const year = date.split('-')[0];
      const point: any = { date };
      
      if (index === 0) {
        lastYear = year;
        point.portfolio = startBalance;
        point.benchmark = startBalance;
        return point;
      }

      const prevDate = filteredDates[index - 1];
      
      // Annual Rebalancing: If year changes, redistribute total value
      if (year !== lastYear) {
        const totalVal = Object.values(assetValues).reduce((a, b) => a + b, 0);
        activeAllocations.forEach(alloc => {
          assetValues[alloc.symbol] = totalVal * alloc.weight;
        });
        lastYear = year;
      }

      // Update asset values based on daily return
      let newTotalPortfolioValue = 0;
      activeAllocations.forEach(alloc => {
        const dailyReturn = dateMap[date][alloc.symbol] / dateMap[prevDate][alloc.symbol];
        assetValues[alloc.symbol] *= dailyReturn;
        newTotalPortfolioValue += assetValues[alloc.symbol];
      });

      currentBenchmarkValue *= (dateMap[date]['SPY'] / dateMap[prevDate]['SPY']);
      
      point.portfolio = newTotalPortfolioValue;
      point.benchmark = currentBenchmarkValue;
      return point;
    });

    setHistoricalData(chartPoints);

    // Calculate Annual Returns for Bar Chart (using rebalanced data)
    const annualData: any[] = [];
    const yearsSet = new Set(filteredDates.map(d => d.split('-')[0]));
    const sortedYears = Array.from(yearsSet).sort();

    sortedYears.forEach(year => {
      const yearPoints = chartPoints.filter(p => p.date.startsWith(year));
      if (yearPoints.length > 0) {
        const lastPointOfYear = yearPoints[yearPoints.length - 1];
        const firstPointOfYear = yearPoints[0];
        const firstIdx = filteredDates.indexOf(firstPointOfYear.date);
        const prevPoint = firstIdx > 0 ? chartPoints[firstIdx - 1] : null;
        
        const basePortfolio = prevPoint ? prevPoint.portfolio : startBalance;
        const baseBenchmark = prevPoint ? prevPoint.benchmark : startBalance;
        
        const pRet = basePortfolio > 0 ? (lastPointOfYear.portfolio / basePortfolio) - 1 : 0;
        const bRet = baseBenchmark > 0 ? (lastPointOfYear.benchmark / baseBenchmark) - 1 : 0;
        
        annualData.push({
          year,
          portfolio: pRet * 100,
          benchmark: bRet * 100
        });
      }
    });
    setAnnualReturns(annualData);
  }, [allData, timeRange, totalInvestment, activeAllocations, isWeightValid]);

  const stats = useMemo(() => {
    if (historicalData.length < 2 || !isWeightValid) return null;

    const portfolioDailyReturns: number[] = [];
    const benchmarkDailyReturns: number[] = [];
    let pMaxDrawdown = 0;
    let bMaxDrawdown = 0;
    let pPeak = 0;
    let bPeak = 0;

    for (let i = 1; i < historicalData.length; i++) {
      const pReturn = (historicalData[i].portfolio / historicalData[i-1].portfolio) - 1;
      const bReturn = (historicalData[i].benchmark / historicalData[i-1].benchmark) - 1;
      portfolioDailyReturns.push(pReturn);
      benchmarkDailyReturns.push(bReturn);

      if (historicalData[i].portfolio > pPeak) pPeak = historicalData[i].portfolio;
      const pDd = (pPeak - historicalData[i].portfolio) / pPeak;
      if (pDd > pMaxDrawdown) pMaxDrawdown = pDd;

      if (historicalData[i].benchmark > bPeak) bPeak = historicalData[i].benchmark;
      const bDd = (bPeak - historicalData[i].benchmark) / bPeak;
      if (bDd > bMaxDrawdown) bMaxDrawdown = bDd;
    }

    const startDate = new Date(historicalData[0].date);
    const endDate = new Date(historicalData[historicalData.length - 1].date);
    const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const startBalance = totalInvestment;
    const totalReturn = (historicalData[historicalData.length - 1].portfolio / startBalance) - 1;
    const benchmarkTotalReturn = (historicalData[historicalData.length - 1].benchmark / startBalance) - 1;

    const cagr = Math.pow(1 + totalReturn, 1 / years) - 1;
    const benchmarkCagr = Math.pow(1 + benchmarkTotalReturn, 1 / years) - 1;

    const avgDailyReturn = portfolioDailyReturns.reduce((a, b) => a + b, 0) / portfolioDailyReturns.length;
    const dailyStdDev = Math.sqrt(portfolioDailyReturns.reduce((a, b) => a + Math.pow(b - avgDailyReturn, 2), 0) / portfolioDailyReturns.length);
    const annualizedStdDev = dailyStdDev * Math.sqrt(252);

    const avgBenchmarkDailyReturn = benchmarkDailyReturns.reduce((a, b) => a + b, 0) / benchmarkDailyReturns.length;
    const dailyBenchmarkStdDev = Math.sqrt(benchmarkDailyReturns.reduce((a, b) => a + Math.pow(b - avgBenchmarkDailyReturn, 2), 0) / benchmarkDailyReturns.length);
    const annualizedBenchmarkStdDev = dailyBenchmarkStdDev * Math.sqrt(252);

    // Sharpe Ratio (assuming 2% risk free rate)
    const sharpeRatio = (cagr - 0.02) / annualizedStdDev;
    const benchmarkSharpeRatio = (benchmarkCagr - 0.02) / annualizedBenchmarkStdDev;

    // Correlation
    let numerator = 0;
    let denP = 0;
    let denB = 0;
    for (let i = 0; i < portfolioDailyReturns.length; i++) {
      const diffP = portfolioDailyReturns[i] - avgDailyReturn;
      const diffB = benchmarkDailyReturns[i] - avgBenchmarkDailyReturn;
      numerator += diffP * diffB;
      denP += diffP * diffP;
      denB += diffB * diffB;
    }
    const correlation = numerator / Math.sqrt(denP * denB);

    // Best/Worst Year
    const bestYear = Math.max(...annualReturns.map(d => d.portfolio)) / 100;
    const worstYear = Math.min(...annualReturns.map(d => d.portfolio)) / 100;
    const benchmarkBestYear = Math.max(...annualReturns.map(d => d.benchmark)) / 100;
    const benchmarkWorstYear = Math.min(...annualReturns.map(d => d.benchmark)) / 100;

    return {
      cagr,
      benchmarkCagr,
      stdDev: annualizedStdDev,
      benchmarkStdDev: annualizedBenchmarkStdDev,
      maxDrawdown: pMaxDrawdown,
      benchmarkMaxDrawdown: bMaxDrawdown,
      bestYear,
      worstYear,
      benchmarkBestYear,
      benchmarkWorstYear,
      sharpeRatio,
      benchmarkSharpeRatio,
      correlation,
      startBalance,
      endBalance: startBalance * (1 + totalReturn),
      benchmarkEndBalance: startBalance * (1 + benchmarkTotalReturn),
      startDate: historicalData[0].date,
      endDate: historicalData[historicalData.length - 1].date
    };
  }, [historicalData, annualReturns, totalInvestment, isWeightValid]);

  const combinedAnnualReturns = useMemo(() => {
    if (!stats || annualReturns.length === 0 || !isWeightValid) return annualReturns;

    if (!isProjected || projectedAnnualReturns.length === 0) {
      return annualReturns.map(d => ({ ...d, isFuture: false }));
    }

    return [
      ...annualReturns.map(d => ({ ...d, isFuture: false })),
      ...projectedAnnualReturns
    ];
  }, [annualReturns, stats, isProjected, projectedAnnualReturns, isWeightValid]);


  const handleBacktest = async () => {
    if (!user || !userData) return;
    
    if (userData.role !== 'admin') {
      const success = await deductCredits(user.uid);
      if (!success) {
        setShowUpsell(true);
        return;
      }
      setUserData(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
    }
    
    setAppliedCustomAllocations([...customAllocations]);
    setIsBacktested(true);
  };

  const handleStartProjection = async () => {
    if (!stats || !user || !userData) return;

    // Credit Check & Deduction
    if (userData.role !== 'admin') {
      const success = await deductCredits(user.uid);
      if (!success) {
        setShowUpsell(true);
        return;
      }
      setUserData(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
    }

    setIsProjecting(true);
    setAiReasoning(null);
    
    try {
      // Real AI Inference
      const aiParams = await getAIProjectionParams(currentProfile.allocations, stats);
      setAiReasoning(aiParams.reasoning);
      setMarketSentiment(aiParams.marketSentiment);

      const years = 10;
      const newProjectionData = [];
      const newProjectedAnnualReturns = [];
      
      // Use AI-provided parameters
      const expReturn = aiParams.expectedReturn;
      const vol = aiParams.volatility;
      const bExpReturn = aiParams.benchmarkExpectedReturn;
      const bVol = aiParams.benchmarkVolatility;

      // Convert annual to monthly
      // To better match the geometric mean (CAGR) in a stochastic simulation, 
      // we use the arithmetic mean adjustment: Ra = Rg + (sigma^2 / 2)
      const annualArithmeticReturn = expReturn + (Math.pow(vol, 2) / 2);
      const monthlyExpReturn = Math.pow(1 + annualArithmeticReturn, 1/12) - 1;
      const monthlyStdDev = vol / Math.sqrt(12);
      
      const bAnnualArithmeticReturn = bExpReturn + (Math.pow(bVol, 2) / 2);
      const bMonthlyExpReturn = Math.pow(1 + bAnnualArithmeticReturn, 1/12) - 1;
      const bMonthlyStdDev = bVol / Math.sqrt(12);

      const nextGaussian = () => {
        const u = 1 - Math.random();
        const v = 1 - Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };

      let portfolioVal = totalInvestment;
      let benchmarkVal = totalInvestment;
      const now = new Date();

      // To ensure consistency, we'll track annual returns as we go
      let yearlyPortfolioStart = totalInvestment;
      let yearlyBenchmarkStart = totalInvestment;
      const lastHistoricalYear = parseInt(annualReturns[annualReturns.length - 1]?.year || now.getFullYear().toString());

      for (let i = 0; i <= years * 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        newProjectionData.push({
          date: dateStr,
          portfolio: portfolioVal,
          benchmark: benchmarkVal
        });

        // Don't update for the first point (month 0)
        if (i === years * 12) break;

        // Reduce noise multiplier slightly (0.8) to make the trend more apparent as requested
        const pRandomReturn = monthlyExpReturn + (nextGaussian() * monthlyStdDev * 0.8);
        const bRandomReturn = bMonthlyExpReturn + (nextGaussian() * bMonthlyStdDev * 0.8);

        portfolioVal = portfolioVal * (1 + pRandomReturn);
        benchmarkVal = benchmarkVal * (1 + bRandomReturn);

        // At the end of each year (12 months), record the annual return
        if ((i + 1) % 12 === 0) {
          const yearNum = Math.floor((i + 1) / 12);
          newProjectedAnnualReturns.push({
            year: (lastHistoricalYear + yearNum).toString(),
            portfolio: (portfolioVal / yearlyPortfolioStart - 1) * 100,
            benchmark: (benchmarkVal / yearlyBenchmarkStart - 1) * 100,
            isFuture: true
          });
          yearlyPortfolioStart = portfolioVal;
          yearlyBenchmarkStart = benchmarkVal;
        }
      }

      setProjectionData(newProjectionData);
      setProjectedAnnualReturns(newProjectedAnnualReturns);
      stateParamsKey.current = currentParamsKey;
      setIsProjected(true);
    } catch (error) {
      console.error("AI Projection failed:", error);
    } finally {
      setIsProjecting(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Header & Inputs */}
      <div className="space-y-6 md:space-y-8">
        <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-[#141414]/5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
              <Calculator className="text-emerald-600" size={24} />
              {t('investmentPlannerTitle')}
            </h2>
            <div className="bg-[#141414] text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center justify-between md:justify-start gap-4">
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">{t('totalInvestmentEstimated')}</span>
              <span className="text-xl md:text-2xl font-bold">{formatLocal(totalInvestment, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-3 md:space-y-4">
              <label className="text-[9px] md:text-[10px] text-[#141414]/40 uppercase font-bold mb-1 block">{t('monthlyContributionLabel')}</label>
              <div className="relative">
                <span className="absolute left-0 bottom-2 text-xl md:text-2xl font-bold text-[#141414]/20">{currencySymbol}</span>
                <input 
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => onMonthlyContributionChange(Number(e.target.value))}
                  className="w-full text-3xl md:text-4xl font-bold bg-transparent border-b-2 border-[#141414]/10 focus:border-emerald-500 outline-none pb-2 pl-20 transition-colors"
                />
              </div>
              <p className="text-[10px] md:text-xs text-[#141414]/40">{t('monthlyContributionSyncDesc')}</p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <label className="text-[9px] md:text-[10px] text-[#141414]/40 uppercase font-bold mb-1 block">{t('lumpSumLabel')}</label>
              <div className="relative">
                <span className="absolute left-0 bottom-2 text-xl md:text-2xl font-bold text-[#141414]/20">{currencySymbol}</span>
                <input 
                  type="number"
                  value={lumpSum}
                  onChange={(e) => setLumpSum(Number(e.target.value))}
                  className="w-full text-3xl md:text-4xl font-bold bg-transparent border-b-2 border-[#141414]/10 focus:border-emerald-500 outline-none pb-2 pl-20 transition-colors"
                  placeholder="0"
                />
              </div>
              <p className="text-[10px] md:text-xs text-[#141414]/40">{t('lumpSumDesc')}</p>
            </div>
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] text-[#141414]/40 uppercase font-bold block">{t('riskPreferenceLabel')}</label>
              {userData?.role === 'admin' && (
                <button 
                  onClick={() => {
                    if (isEditingProfiles) {
                      setIsEditingProfiles(false);
                    } else {
                      // Preserve icons by avoiding JSON stringify
                      setEditingProfiles(riskProfiles.map(p => ({
                        ...p,
                        allocations: p.allocations.map(a => ({ ...a }))
                      })));
                      setIsEditingProfiles(true);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#141414]/5 hover:bg-[#141414]/10 rounded-xl text-[10px] font-bold transition-all"
                >
                  {isEditingProfiles ? <X size={12} /> : <Edit2 size={12} />}
                  {isEditingProfiles ? t('cancelEdit') : t('editDefaultProfiles')}
                </button>
              )}
            </div>

            {isEditingProfiles ? (
              <div className="space-y-6 bg-[#141414]/[0.02] p-6 rounded-3xl border border-dashed border-[#141414]/10">
                {editingProfiles.filter(p => p.id !== 'custom').map((profile, pIdx) => (
                  <div key={profile.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm ${profile.color}`}>
                        <profile.icon size={16} />
                      </div>
                      <h4 className="font-bold text-sm">{t(profile.name)}</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.allocations.map((alloc, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={alloc.symbol}
                            onChange={(e) => {
                              const newProfiles = [...editingProfiles];
                              const newAllocations = [...newProfiles[pIdx].allocations];
                              newAllocations[aIdx] = { ...newAllocations[aIdx], symbol: e.target.value.toUpperCase() };
                              newProfiles[pIdx] = { ...newProfiles[pIdx], allocations: newAllocations };
                              setEditingProfiles(newProfiles);
                            }}
                            onBlur={(e) => syncTickerName(pIdx, aIdx, e.target.value)}
                            placeholder={t('tickerPlaceholder')}
                            className="flex-1 bg-white border border-[#141414]/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <div className="relative w-24">
                            <input 
                              type="number"
                              value={alloc.weight * 100}
                              onChange={(e) => {
                                const newProfiles = [...editingProfiles];
                                const newAllocations = [...newProfiles[pIdx].allocations];
                                newAllocations[aIdx] = { ...newAllocations[aIdx], weight: Number(e.target.value) / 100 };
                                newProfiles[pIdx] = { ...newProfiles[pIdx], allocations: newAllocations };
                                setEditingProfiles(newProfiles);
                              }}
                              className="w-full bg-white border border-[#141414]/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#141414]/20">%</span>
                          </div>
                          <button 
                            onClick={() => {
                              const newProfiles = [...editingProfiles];
                              const newAllocations = newProfiles[pIdx].allocations.filter((_, i) => i !== aIdx);
                              newProfiles[pIdx] = { ...newProfiles[pIdx], allocations: newAllocations };
                              setEditingProfiles(newProfiles);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newProfiles = [...editingProfiles];
                          newProfiles[pIdx] = {
                            ...newProfiles[pIdx],
                            allocations: [...newProfiles[pIdx].allocations, { symbol: '', weight: 0 }]
                          };
                          setEditingProfiles(newProfiles);
                        }}
                        className="flex items-center justify-center gap-2 py-2 border border-dashed border-[#141414]/10 rounded-xl text-[10px] font-bold text-[#141414]/40 hover:bg-white transition-all"
                      >
                        <Plus size={12} />
                        {t('addTicker')}
                      </button>
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-lg inline-block ${
                      Math.abs(profile.allocations.reduce((s, a) => s + a.weight, 0) - 1) < 0.001 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {t('totalWeight')}: {(profile.allocations.reduce((s, a) => s + a.weight, 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-[#141414]/5">
                  <button 
                    onClick={handleSaveProfiles}
                    disabled={isLoading}
                    className="w-full py-3 bg-[#141414] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#141414]/90 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('saveDefaultProfiles')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {riskProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      setRiskId(profile.id);
                    }}
                    className={`p-3 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all text-left group ${
                      riskId === profile.id 
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                        : 'border-[#141414]/5 hover:border-[#141414]/10 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl mb-3 md:mb-4 flex items-center justify-center ${
                      riskId === profile.id ? 'bg-emerald-600 text-white' : 'bg-[#141414]/5 text-[#141414]/40'
                    }`}>
                      <profile.icon size={18} />
                    </div>
                    <h4 className="font-bold text-xs md:text-sm mb-1">{t(profile.name)}</h4>
                    <p className="text-[9px] md:text-[10px] text-[#141414]/40 leading-tight md:leading-relaxed">{t(profile.description)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Portfolio Editor */}
          <AnimatePresence>
            {riskId === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 pt-8 border-t border-[#141414]/5 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <PieChartIcon size={16} className="text-indigo-600" />
                    {t('customPortfolioEditor')}
                  </h3>
                  <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                    Math.abs(totalCustomWeight - 1) < 0.001 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {t('totalWeight')}: {(totalCustomWeight * 100).toFixed(0)}% / 100%
                  </div>
                </div>

                <div className="space-y-3">
                  {customAllocations.map((alloc, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="relative">
                          <input 
                            type="text"
                            value={alloc.symbol}
                            onChange={(e) => {
                              const newAllocations = [...customAllocations];
                              newAllocations[index].symbol = e.target.value.toUpperCase();
                              setCustomAllocations(newAllocations);
                            }}
                            placeholder={t('tickerPlaceholder')}
                            className="w-full bg-[#141414]/5 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="relative">
                          <input 
                            type="number"
                            value={alloc.weight === 0 ? "" : Number((alloc.weight * 100).toFixed(2))}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newAllocations = [...customAllocations];
                              newAllocations[index].weight = val === "" ? 0 : parseFloat(val) / 100;
                              setCustomAllocations(newAllocations);
                            }}
                            placeholder={t('weight')}
                            className={`w-full bg-[#141414]/5 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none pr-8 transition-colors ${
                              totalCustomWeight > 1 && index === customAllocations.length - 1
                                ? 'text-red-600 bg-red-50 ring-1 ring-red-500'
                                : ''
                            }`}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#141414]/20">%</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setCustomAllocations(customAllocations.filter((_, i) => i !== index));
                        }}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <ArrowDownRight size={18} className="rotate-45" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      setCustomAllocations([...customAllocations, { symbol: '', weight: 0 }]);
                    }}
                    className="w-full py-3 border-2 border-dashed border-[#141414]/10 rounded-xl text-xs font-bold text-[#141414]/40 hover:border-[#141414]/20 hover:text-[#141414]/60 transition-all flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={14} />
                    {t('addTicker')}
                  </button>

                  <div className="pt-6">
                    <button
                      onClick={handleBacktest}
                      disabled={!isWeightValid || isLoading || isBacktested}
                      className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isWeightValid && !isBacktested
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                          : 'bg-[#141414]/5 text-[#141414]/20 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          {t('analyzing')}
                        </>
                      ) : (
                        <>
                          <Activity size={18} />
                          {isBacktested ? t('backtestCompleted') : t('startBacktestAnalysis')}
                        </>
                      )}
                    </button>
                    {!isWeightValid && (
                      <p className="text-[10px] text-red-500 font-bold mt-2 text-center">
                        * {t('weightWarning')}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Allocation Table */}
      <div className="bg-white rounded-3xl border border-[#141414]/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#141414]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">{t('copyPortfolioAllocation')}</h3>
            <p className="text-xs text-[#141414]/40 mt-1">{t('basedOnRiskDesc')}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('riskLevel')}</p>
              <p className={`text-sm font-bold ${currentProfile.color}`}>{t(currentProfile.name)}</p>
            </div>
            <div className="w-px h-8 bg-[#141414]/5" />
            <div className="text-right">
              <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('totalInvestmentAmount')}</p>
              <p className="text-xl font-bold text-emerald-600">{formatLocal(totalInvestment, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-30 bg-white">
              <tr className="bg-[#141414]/5 text-[#141414]/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                <th className="px-4 md:px-6 py-3 md:py-4 sticky left-0 z-40 bg-white border-b border-[#141414]/10 w-[110px] md:w-[240px]">{t('tickerWithLabel')}</th>
                <th className="px-4 md:px-6 py-3 md:py-4 border-b border-[#141414]/10">{t('allocationRatio')}</th>
                <th className="px-4 md:px-6 py-3 md:py-4 border-b border-[#141414]/10">{t('estimatedCost')}</th>
                <th className="px-4 md:px-6 py-3 md:py-4 border-b border-[#141414]/10">{t('sharesToBuy')}</th>
                <th className="px-4 md:px-6 py-3 md:py-4 border-b border-[#141414]/10">{t('forwardPe')}</th>
                <th className="px-4 md:px-6 py-3 md:py-4 border-b border-[#141414]/10">{t('currentPrice')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]/5">
              {currentProfile.allocations.map((alloc) => {
                const mData = marketData.find(d => d.symbol === alloc.symbol);
                const investAmount = totalInvestment * alloc.weight;
                const shares = mData?.price ? investAmount / convert(mData.price) : 0;
                const isTrial = userData?.role === 'trial';

                return (
                  <tr key={alloc.symbol} className="hover:bg-[#141414]/2 transition-colors group">
                    <td className="px-4 md:px-6 py-3 md:py-4 sticky left-0 z-20 bg-white group-hover:bg-[#F5F5F0] transition-colors border-r border-[#141414]/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[110px] md:w-[240px]">
                      <div className="flex flex-col">
                        {isTrial ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm md:text-base text-[#141414] blur-md select-none">XXXX</span>
                            <button 
                              onClick={() => setShowUpsell(true)}
                              className="p-1.5 bg-[#141414]/5 hover:bg-[#141414]/10 rounded-lg text-[#141414]/40 hover:text-[#141414] transition-all"
                              title={t('unlockTicker')}
                            >
                              <Lock size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-sm md:text-base text-[#141414]">{alloc.symbol}</span>
                        )}
                        <span className={`text-[9px] md:text-[10px] text-[#141414]/40 font-medium ${isTrial ? "blur-sm select-none" : ""}`}>
                          {isTrial ? t('hiddenCompany') : (alloc.name || mData?.name || '-')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <span className="text-base md:text-lg font-mono font-bold text-[#141414]">{(alloc.weight * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-bold text-emerald-600 text-xs md:text-sm">
                      {formatLocal(investAmount)}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-bold text-blue-600 text-xs md:text-sm">
                      {shares > 0 ? shares.toFixed(4) : '-'}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">
                      {mData?.forwardPe ? mData.forwardPe.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">
                      {mData?.price ? formatCurrency(mData.price) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Visualizer */}
      <AnimatePresence mode="wait">
        {isBacktested ? (
          <motion.div 
            key="backtest-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <LineChartIcon size={20} className="text-emerald-600" />
              {t('backtestVisualizer')}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
                  {stats?.startDate}
                </span>
                <span className="text-[#141414]/20">{t('to')}</span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
                  {stats?.endDate}
                </span>
              </div>
              <div className="flex bg-[#141414]/5 p-1 rounded-xl">
                {(['YTD', '1Y', '5Y', '10Y', 'MAX'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      timeRange === range 
                        ? 'bg-white text-[#141414] shadow-sm' 
                        : 'text-[#141414]/40 hover:text-[#141414]/60'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('initialCapital')}</p>
            <p className="text-2xl font-bold text-[#141414]">{stats ? formatLocal(stats.startBalance, { maximumFractionDigits: 0, minimumFractionDigits: 0 }) : '-'}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-[#141414]/2 border border-[#141414]/5">
            <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('annualReturnCagr')}</p>
            <p className={`text-xl font-bold ${stats && stats.cagr >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {stats ? `${(stats.cagr * 100).toFixed(2)}%` : '-'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#141414]/2 border border-[#141414]/5">
            <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('benchmarkCagrSpy')}</p>
            <p className={`text-xl font-bold ${stats && stats.benchmarkCagr >= 0 ? 'text-[#155DFC]' : 'text-red-500'}`}>
              {stats ? `${(stats.benchmarkCagr * 100).toFixed(2)}%` : '-'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#141414]/2 border border-[#141414]/5">
            <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('riskStdDev')}</p>
            <p className="text-xl font-bold text-[#141414]">
              {stats ? `${(stats.stdDev * 100).toFixed(2)}%` : '-'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#141414]/2 border border-[#141414]/5">
            <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('maxDrawdown')}</p>
            <p className="text-xl font-bold text-red-500">
              {stats ? `${(stats.maxDrawdown * 100).toFixed(2)}%` : '-'}
            </p>
          </div>
        </div>

        <div className="h-[400px] w-full relative mb-12">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                <p className="text-sm font-bold text-[#141414]/60">{t('fetchingHistoricalData')}</p>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#141414" strokeOpacity={0.05} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                minTickGap={60}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => formatLocal(val, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-4 border border-[#141414]/10 rounded-xl shadow-xl">
                        <p className="font-bold text-[#141414] mb-2">{label}</p>
                        <div className="space-y-1">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: entry.color || entry.stroke }} 
                              />
                              <span className="text-xs text-[#141414]/60">{entry.name}:</span>
                              <span className="text-xs font-bold text-[#141414]">
                                {formatLocal(entry.value, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area 
                type="monotone" 
                dataKey="portfolio" 
                name={t('selectedPortfolio')} 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPortfolio)" 
              />
              <Line 
                type="monotone" 
                dataKey="benchmark" 
                name={t('spyBenchmark')} 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Comparison Table */}
        <div className="mt-12 space-y-6">
          <h4 className="text-md font-bold flex items-center gap-2">
            <TableIcon size={18} className="text-emerald-600" />
            {t('performanceComparison')}
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-[#141414]/5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#141414]/5 text-[#141414]/50 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                  <th className="px-4 md:px-6 py-3 md:py-4">{t('metric')}</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-emerald-600">{t('portfolio')}</th>
                  <th className="px-4 md:px-6 py-3 md:py-4">{t('benchmarkSpy')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]/5">
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('startBalance')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{stats ? formatLocal(stats.startBalance) : '-'}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{stats ? formatLocal(stats.startBalance) : '-'}</td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('endBalance')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-bold text-emerald-600 text-xs md:text-sm">
                    {stats ? formatLocal(stats.endBalance) : '-'}
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">
                    {stats ? formatLocal(stats.benchmarkEndBalance) : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('annualizedReturnCagr')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-bold text-emerald-600 text-xs md:text-sm">{((stats?.cagr || 0) * 100).toFixed(2)}%</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{((stats?.benchmarkCagr || 0) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('standardDeviation')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{((stats?.stdDev || 0) * 100).toFixed(2)}%</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{((stats?.benchmarkStdDev || 0) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('bestYear')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-emerald-600 text-xs md:text-sm">{((stats?.bestYear || 0) * 100).toFixed(2)}%</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{((stats?.benchmarkBestYear || 0) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('worstYear')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-red-500 text-xs md:text-sm">{((stats?.worstYear || 0) * 100).toFixed(2)}%</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-red-500 text-xs md:text-sm">{((stats?.benchmarkWorstYear || 0) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('maxDrawdown')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-red-500 text-xs md:text-sm">{((stats?.maxDrawdown || 0) * 100).toFixed(2)}%</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-red-500 text-xs md:text-sm">{((stats?.benchmarkMaxDrawdown || 0) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('sharpeRatio')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-bold text-xs md:text-sm">{stats?.sharpeRatio.toFixed(2)}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{stats?.benchmarkSharpeRatio.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('benchmarkCorrelation')}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{stats?.correlation.toFixed(2)}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">1.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Growth Projection */}
        <div className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Zap size={20} className="text-amber-500" />
                {t('aiGrowthProjection')}
              </h3>
              <p className="text-xs text-[#141414]/40 mt-1">{t('aiGrowthProjectionDesc')}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleStartProjection}
                disabled={isProjecting || !stats}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              >
                {isProjecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('aiAnalyzing')}
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    {isProjected ? t('restartAiProjection') : t('startAiProjection')}
                  </>
                )}
              </button>
              {isProjected && !isProjecting && (
                <div className="text-right hidden md:block">
                  <p className="text-[10px] text-[#141414]/40 uppercase font-bold mb-1">{t('expectedValue10Years')}</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${(() => {
                      if (projectionData.length === 0) return '0';
                      const lastVal = projectionData[projectionData.length - 1].portfolio;
                      return lastVal.toLocaleString(undefined, { maximumFractionDigits: 0 });
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {isProjected ? (
            <div className="space-y-8">
              <div className="h-[400px] md:h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="colorProjPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#141414" strokeOpacity={0.05} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                      minTickGap={40}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                      tickFormatter={(val) => formatLocal(val, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-4 border border-[#141414]/10 rounded-xl shadow-xl">
                              <p className="font-bold text-[#141414] mb-2">{label}</p>
                              <div className="space-y-1">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: entry.color || entry.stroke }} 
                                      />
                                      <span className="text-xs text-[#141414]/60">{entry.name}:</span>
                                    </div>
                                    <span className="text-xs font-bold text-[#141414]">
                                      {formatLocal(entry.value, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Area 
                      type="monotone" 
                      dataKey="portfolio" 
                      name={t('projectedPortfolio')} 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorProjPortfolio)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="benchmark" 
                      name={t('projectedSpy')} 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-amber-50/50 rounded-3xl p-8 border border-amber-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{t('aiProjectionAnalysis')}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{t('marketOutlook')}</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {marketSentiment || t('neutral')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/60 rounded-2xl p-6 border border-amber-100/50">
                  <p className="text-sm text-[#141414]/80 leading-relaxed whitespace-pre-wrap">
                    {aiReasoning || t('analyzing')}
                  </p>
                </div>
                <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <p className="text-xs font-bold text-amber-700/60 flex items-center gap-2">
                    <Info size={14} />
                    {t('projectionDisclaimer')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[350px] w-full bg-[#141414]/2 rounded-3xl border-2 border-dashed border-[#141414]/5 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <Zap size={32} />
              </div>
              <h4 className="text-lg font-bold mb-2">{t('clickToStartProjection')}</h4>
              <p className="text-sm text-[#141414]/40 max-w-md">
                {t('projectionMethodology')}
              </p>
            </div>
          )}
        </div>

        {/* Annual Returns Bar Chart */}
        <div className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-bold flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-600" />
            {t('annualReturnsChart')}
            </h4>
          </div>
          <div className="h-[450px] md:h-[500px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={combinedAnnualReturns} 
                margin={{ top: 40, right: 10, left: 0, bottom: 5 }}
                barGap={1}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#141414" strokeOpacity={0.05} />
                <XAxis 
                  dataKey="year" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const isFuture = payload[0].payload.isFuture;
                      return (
                        <div className="bg-white p-4 rounded-2xl shadow-xl border-none">
                          <p className="text-[10px] font-bold text-[#141414]/40 uppercase mb-2">
                            {label} {isFuture ? t('projectionSuffix') : ''}
                          </p>
                          <div className="space-y-1.5">
                            {payload.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between gap-8">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-sm" 
                                    style={{ backgroundColor: entry.color }} 
                                  />
                                  <span className="text-xs font-medium text-[#141414]/60">{entry.name}</span>
                                </div>
                                <span className="text-xs font-bold text-[#141414]">
                                  {Number(entry.value).toFixed(2)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="center"
                  height={60}
                  iconType="square"
                  iconSize={12}
                  wrapperStyle={{ paddingTop: '0px', paddingBottom: '30px', fontWeight: 'bold', fontSize: '13px', color: '#141414' }}
                />
                {combinedAnnualReturns.some(d => d.isFuture) && (
                  <>
                    <ReferenceArea 
                      x1={combinedAnnualReturns[0].year}
                      x2={combinedAnnualReturns.filter(d => !d.isFuture).slice(-1)[0]?.year}
                      fill="transparent"
                    >
                      <Label 
                        value={t('historical')} 
                        position="top" 
                        offset={20} 
                        fill="#141414" 
                        opacity={0.4} 
                        fontSize={10} 
                        fontWeight="bold" 
                      />
                    </ReferenceArea>
                    <ReferenceArea 
                      x1={combinedAnnualReturns.find(d => d.isFuture)?.year} 
                      x2={combinedAnnualReturns[combinedAnnualReturns.length - 1].year} 
                      fill="#155DFC" 
                      fillOpacity={0.03}
                    >
                      <Label 
                        value={t('aiProjection')} 
                        position="top" 
                        offset={20} 
                        fill="#155DFC" 
                        opacity={0.6} 
                        fontSize={10} 
                        fontWeight="bold" 
                      />
                    </ReferenceArea>
                  </>
                )}
                <Bar dataKey="benchmark" name={t('spyBenchmark')} fill="#155DFC" radius={[4, 4, 0, 0]}>
                  {combinedAnnualReturns.map((entry, index) => (
                    <Cell 
                      key={`cell-b-${index}`} 
                      fill="#155DFC" 
                      fillOpacity={entry.isFuture ? 0.3 : 0.6}
                    />
                  ))}
                </Bar>
                <Bar dataKey="portfolio" name={t('selectedPortfolio')} fill="#10b981" radius={[4, 4, 0, 0]}>
                  {combinedAnnualReturns.map((entry, index) => (
                    <Cell 
                      key={`cell-p-${index}`} 
                      fill="#10b981" 
                      fillOpacity={entry.isFuture ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    ) : (
      <motion.div
        key="backtest-placeholder"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-[350px] w-full bg-white rounded-3xl border-2 border-dashed border-[#141414]/5 flex flex-col items-center justify-center text-center p-8"
      >
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
          <Activity size={32} />
        </div>
        <h4 className="text-lg font-bold mb-2">{t('clickToStartBacktest')}</h4>
        <p className="text-sm text-[#141414]/40 max-w-md">
          {t('backtestMethodology')}
        </p>
      </motion.div>
    )}
  </AnimatePresence>
</div>
  );
};
