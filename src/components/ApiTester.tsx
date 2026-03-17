import React, { useState } from 'react';
import { Search, Loader2, Code, ChevronDown, ChevronUp, BarChart3, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ApiTester: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'batch' | 'historical'>('batch');
  const [symbols, setSymbols] = useState('AAPL, TSLA, MSFT, 2330.TW, 0050.TW');
  const [singleSymbol, setSingleSymbol] = useState('AAPL');
  const [period, setPeriod] = useState('1mo');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      let url = '';
      if (activeTab === 'batch') {
        if (!symbols.trim()) return;
        url = `/api/batch-test?symbols=${encodeURIComponent(symbols)}`;
      } else if (activeTab === 'historical') {
        if (!singleSymbol.trim()) return;
        url = `/api/historical-test?symbol=${encodeURIComponent(singleSymbol)}&period=${period}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch');
      }
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#141414]/40 uppercase text-[10px] font-bold tracking-widest">
          <Code size={14} />
          API Tester
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-[#141414]/5 rounded-lg transition-colors"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            {/* Tabs */}
            <div className="flex gap-1 bg-[#141414]/5 p-1 rounded-xl">
              <button 
                onClick={() => { setActiveTab('batch'); setResult(null); }}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'batch' ? 'bg-white shadow-sm text-[#141414]' : 'text-[#141414]/40 hover:text-[#141414]'}`}
              >
                Batch Quote
              </button>
              <button 
                onClick={() => { setActiveTab('historical'); setResult(null); }}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'historical' ? 'bg-white shadow-sm text-[#141414]' : 'text-[#141414]/40 hover:text-[#141414]'}`}
              >
                Historical
              </button>
            </div>

            <p className="text-xs text-[#141414]/50 leading-relaxed">
              {activeTab === 'batch' && "測試 yahooFinance.quote() 批量模式。"}
              {activeTab === 'historical' && "測試 yahooFinance.chart() 歷史數據。"}
            </p>
            
            <div className="flex gap-2">
              {activeTab === 'batch' ? (
                <input 
                  type="text"
                  value={symbols}
                  onChange={(e) => setSymbols(e.target.value)}
                  placeholder="e.g. AAPL, TSLA"
                  className="flex-1 px-4 py-2 bg-[#141414]/5 rounded-xl text-sm font-mono outline-none focus:ring-2 ring-[#141414]/10 transition-all"
                />
              ) : (
                <div className="flex-1 flex gap-2">
                  <input 
                    type="text"
                    value={singleSymbol}
                    onChange={(e) => setSingleSymbol(e.target.value)}
                    placeholder="e.g. AAPL"
                    className="flex-1 px-4 py-2 bg-[#141414]/5 rounded-xl text-sm font-mono outline-none focus:ring-2 ring-[#141414]/10 transition-all"
                  />
                  {activeTab === 'historical' && (
                    <select 
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="px-3 py-2 bg-[#141414]/5 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="1mo">1 Month</option>
                      <option value="1y">1 Year</option>
                    </select>
                  )}
                </div>
              )}
              <button 
                onClick={handleTest}
                disabled={isLoading}
                className="px-4 py-2 bg-[#141414] text-white rounded-xl font-bold text-sm hover:bg-[#141414]/90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                測試
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#141414]/40 uppercase">
                  <span>回傳結果</span>
                  <button 
                    onClick={() => setResult(null)}
                    className="hover:text-[#141414]"
                  >
                    清除
                  </button>
                </div>
                <div className="max-h-[300px] overflow-auto bg-[#141414] text-emerald-400 p-4 rounded-xl text-[10px] font-mono custom-scrollbar">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isExpanded && (
        <p className="text-[10px] text-[#141414]/30 italic">點擊展開以測試 Yahoo Finance API</p>
      )}
    </div>
  );
};
