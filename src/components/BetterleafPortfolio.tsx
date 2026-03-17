import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Eye, Target, Info, ArrowUpRight, ArrowDownRight, ExternalLink, RefreshCw, Upload, Loader2, Lock, Edit2, Save, Plus, Trash2, X } from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { APP_ID, getUpsellLink } from '../services/authService';
import { fetchMarketData } from '../services/geminiService';
import { useLanguage } from '../services/i18n';
import { useCurrency } from '../services/currencyService';

interface StockItem {
  id?: string; // Unique ID for stable rendering during editing
  symbol: string;
  name: string;
  price: number;
  marketCap: string;
  weight?: number; // Portfolio weight
  upside: number; // Potential upside percentage
  forwardPe: number;
  thesis: string;
  category: 'holding' | 'watchlist';
  operationType?: string; // e.g., 'Buy', 'Hold', 'Sell'
}

const StockTable = ({ 
  title, 
  icon: Icon, 
  tableData, 
  showWeight, 
  category,
  isEditing,
  editingData,
  setEditingData,
  syncStockData,
  role,
  isLoading,
  t
}: { 
  title: string, 
  icon: any, 
  tableData: StockItem[], 
  showWeight?: boolean, 
  category: 'holding' | 'watchlist',
  isEditing: boolean,
  editingData: StockItem[],
  setEditingData: React.Dispatch<React.SetStateAction<StockItem[]>>,
  syncStockData: (id: string, symbol: string) => Promise<void>,
  role?: string,
  isLoading: boolean,
  t: any
}) => {
  const { formatCurrency } = useCurrency();
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockItem, direction: 'asc' | 'desc' } | null>(null);

  const sortedData = useMemo(() => {
    let sortableItems = [...tableData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Special handling for marketCap sorting
        if (sortConfig.key === 'marketCap') {
          const parseMarketCap = (val: any) => {
            if (typeof val !== 'string') return 0;
            const num = parseFloat(val);
            if (isNaN(num)) return 0;
            if (val.toUpperCase().endsWith('T')) return num * 1000000000000;
            if (val.toUpperCase().endsWith('B')) return num * 1000000000;
            if (val.toUpperCase().endsWith('M')) return num * 1000000;
            return num;
          };
          aValue = parseMarketCap(aValue);
          bValue = parseMarketCap(bValue);
        }

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const requestSort = (key: keyof StockItem) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof StockItem) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="bg-white rounded-2xl border border-[#141414]/10 overflow-hidden shadow-sm relative">
      <div className="px-3 md:px-6 py-2 md:py-4 border-b border-[#141414]/10 flex items-center justify-between bg-[#141414]/[0.02]">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-[#141414]/60" />
          <h2 className="text-lg md:text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {isEditing && (
            <button 
              onClick={() => {
                const newItem: StockItem = {
                  id: Math.random().toString(36).substr(2, 9),
                  symbol: '',
                  name: '',
                  price: 0,
                  marketCap: 'N/A',
                  weight: category === 'holding' ? 0 : undefined,
                  upside: 0,
                  forwardPe: 0,
                  thesis: '',
                  category: category,
                  operationType: category === 'watchlist' ? 'Buy' : undefined
                };
                setEditingData(prev => [...prev, newItem]);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all"
            >
              <Plus size={12} />
              {t('addStock')}
            </button>
          )}
          <span className="text-xs font-mono text-[#141414]/40 uppercase tracking-widest">{tableData.length} {t('stocksCount')}</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] custom-scrollbar relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-30 bg-white">
            <tr className="bg-[#141414]/[0.01]">
              <th 
                className="px-2 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[80px] md:w-[240px] sticky left-0 z-40 bg-white cursor-pointer hover:text-[#141414] transition-colors"
                onClick={() => requestSort('symbol')}
              >
                {t('ticker')}{getSortIcon('symbol')}
              </th>
              <th 
                className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[80px] md:w-[100px] cursor-pointer hover:text-[#141414] transition-colors"
                onClick={() => requestSort('price')}
              >
                {t('price')}{getSortIcon('price')}
              </th>
              <th 
                className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[100px] md:w-[120px] cursor-pointer hover:text-[#141414] transition-colors"
                onClick={() => requestSort('marketCap')}
              >
                {t('marketCap')}{getSortIcon('marketCap')}
              </th>
              {showWeight && (
                <th 
                  className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[80px] md:w-[100px] cursor-pointer hover:text-[#141414] transition-colors"
                  onClick={() => requestSort('weight')}
                >
                  {t('weight')}{getSortIcon('weight')}
                </th>
              )}
              <th 
                className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[80px] md:w-[100px] cursor-pointer hover:text-[#141414] transition-colors"
                onClick={() => requestSort('upside')}
              >
                {t('upside')}{getSortIcon('upside')}
              </th>
              {category === 'watchlist' && (
                <th 
                  className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[100px] md:w-[120px] cursor-pointer hover:text-[#141414] transition-colors"
                  onClick={() => requestSort('operationType')}
                >
                  {t('operation')}{getSortIcon('operationType')}
                </th>
              )}
              <th 
                className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[80px] md:w-[100px] cursor-pointer hover:text-[#141414] transition-colors"
                onClick={() => requestSort('forwardPe')}
              >
                {t('fwdPe')}{getSortIcon('forwardPe')}
              </th>
              <th className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 min-w-[200px]">{t('thesis')}</th>
              {isEditing && <th className="px-4 md:px-6 py-2 md:py-3 text-xs md:text-[11px] font-serif italic uppercase tracking-wider text-[#141414]/50 border-b border-[#141414]/10 w-[70px] md:w-[80px]">{t('actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]/5">
            {sortedData.map((stock, idx) => {
            const limit = category === 'holding' ? 2 : 1;
            const isLocked = role === 'trial' && idx >= limit;
            const rowId = stock.id || stock.symbol || idx;
            
            const displayName = stock.name.length > 30 ? stock.name.substring(0, 30) + '...' : stock.name;

            return (
              <tr 
                key={rowId} 
                className={`group transition-colors cursor-default relative ${isLocked ? 'bg-[#141414]/[0.01] overflow-hidden' : 'hover:bg-[#141414]/[0.02]'}`}
              >
                <td className="px-2 md:px-6 py-3 md:py-4 sticky left-0 z-20 bg-white group-hover:bg-[#F5F5F0] transition-colors border-r border-[#141414]/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[80px] md:w-[240px]">
                  {isLocked && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none z-0" />
                  )}
                  <div className="relative z-10">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input 
                          type="text"
                          value={stock.symbol}
                          onChange={(e) => {
                            setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, symbol: e.target.value.toUpperCase() } : d));
                          }}
                          onBlur={(e) => {
                            if (stock.id) syncStockData(stock.id, e.target.value);
                          }}
                          placeholder={t('tickerPlaceholder')}
                          className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs font-bold w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <input 
                          type="text"
                          value={stock.name}
                          onChange={(e) => {
                            setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, name: e.target.value } : d));
                          }}
                          placeholder={t('namePlaceholder')}
                          className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {isLocked ? (
                          <div className="flex items-center gap-2">
                            <div className="relative group/lock">
                              <span className="text-sm font-bold text-[#141414] blur-[6px] select-none opacity-40">XXXX</span>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Lock size={10} className="text-emerald-600 opacity-80" />
                              </div>
                            </div>
                            <a 
                              href={getUpsellLink(role)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-tighter hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-1"
                            >
                              PRO
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs md:text-sm font-bold text-[#141414] group-hover:text-emerald-600 transition-colors">{stock.symbol}</span>
                        )}
                        <span className={`text-[10px] md:text-[11px] text-[#141414]/40 font-medium ${isLocked ? 'blur-[4px] select-none opacity-30' : ''}`}>
                          {isLocked ? t('hiddenCompany') : displayName}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
              <td className={`px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm ${isLocked ? 'blur-[6px] select-none opacity-30' : ''}`}>
                {isEditing ? (
                  <input 
                    type="number"
                    value={stock.price}
                    onChange={(e) => {
                      setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, price: Number(e.target.value) } : d));
                    }}
                    className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs font-bold w-20 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                ) : (
                  isLoading ? (
                    <div className="w-12 h-4 bg-[#141414]/5 animate-pulse rounded" />
                  ) : (
                    formatCurrency(stock.price)
                  )
                )}
              </td>
              <td className={`px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm text-[#141414]/60 ${isLocked ? 'blur-[6px] select-none opacity-30' : ''}`}>
                {isEditing ? (
                  <input 
                    type="text"
                    value={stock.marketCap}
                    onChange={(e) => {
                      setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, marketCap: e.target.value } : d));
                    }}
                    className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs w-20 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                ) : (
                  (!stock.marketCap || stock.marketCap === 'N/A' || stock.marketCap === 'NA' || stock.marketCap === 'n/a' || stock.marketCap === 'N/a') ? '-' : stock.marketCap
                )}
              </td>
              {showWeight && (
                <td className={`px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm ${isLocked ? 'blur-[6px] select-none opacity-30' : ''}`}>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="number"
                        value={stock.weight}
                        onChange={(e) => {
                          setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, weight: Number(e.target.value) } : d));
                        }}
                        className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs font-bold w-16 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <span className="text-[10px] font-bold text-[#141414]/40">%</span>
                    </div>
                  ) : (
                    <span className="text-[#141414]/60">{stock.weight?.toFixed(2)}%</span>
                  )}
                </td>
              )}
              <td className={`px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm ${isLocked ? 'blur-[6px] select-none opacity-30' : ''}`}>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      step="0.1"
                      value={stock.upside}
                      onChange={(e) => {
                        setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, upside: Number(e.target.value) } : d));
                      }}
                      className={`bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs font-bold w-16 focus:ring-2 focus:ring-emerald-500 outline-none ${stock.upside >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    />
                    <span className={`text-[10px] font-bold ${stock.upside >= 0 ? 'text-emerald-600/40' : 'text-red-600/40'}`}>%</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-1 font-bold ${stock.upside >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stock.upside >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{stock.upside}%</span>
                  </div>
                )}
              </td>
              {category === 'watchlist' && (
                <td className={`px-4 md:px-6 py-3 md:py-4 ${isLocked ? 'blur-[6px] select-none opacity-30' : ''}`}>
                  {isEditing ? (
                    <select 
                      value={stock.operationType || 'Buy'}
                      onChange={(e) => {
                        setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, operationType: e.target.value } : d));
                      }}
                      className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="Buy">{t('buy')}</option>
                      <option value="Hold">{t('hold')}</option>
                      <option value="Sell">{t('sell')}</option>
                      <option value="Watch">{t('watch')}</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      stock.operationType === 'Buy' ? 'bg-emerald-100 text-emerald-700' :
                      stock.operationType === 'Sell' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {stock.operationType ? t(stock.operationType.toLowerCase()) : t('watch')}
                    </span>
                  )}
                </td>
              )}
              <td className={`px-4 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm text-[#141414]/60 ${isLocked ? 'blur-[6px] select-none opacity-30' : ''}`}>
                {isEditing ? (
                  <input 
                    type="number"
                    value={stock.forwardPe}
                    onChange={(e) => {
                      setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, forwardPe: Number(e.target.value) } : d));
                    }}
                    className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs w-16 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                ) : (
                  isLoading ? (
                    <div className="w-8 h-4 bg-[#141414]/5 animate-pulse rounded" />
                  ) : (
                    `${stock.forwardPe.toFixed(1)}x`
                  )
                )}
              </td>
              <td className="px-4 md:px-6 py-3 md:py-4">
                {isEditing ? (
                  <textarea 
                    value={stock.thesis}
                    onChange={(e) => {
                      setEditingData(prev => prev.map(d => d.id === stock.id ? { ...d, thesis: e.target.value } : d));
                    }}
                    className="bg-white border border-[#141414]/10 rounded-lg px-2 py-1 text-xs w-full min-w-[200px] h-16 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                ) : (
                  <div className={`flex items-start gap-2 max-w-xs ${isLocked ? 'blur-[6px] select-none opacity-30' : ''}`}>
                    <Info size={14} className="text-[#141414]/20 mt-0.5 shrink-0" />
                    <p className="text-xs text-[#141414]/70 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                      {isLocked ? t('lockedThesis') : stock.thesis}
                    </p>
                  </div>
                )}
              </td>
              {isEditing && (
                <td className="px-4 md:px-6 py-3 md:py-4">
                  <button 
                    onClick={() => {
                      setEditingData(prev => prev.filter(d => d.id !== stock.id));
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>
      {role === 'trial' && tableData.length > (category === 'holding' ? 2 : 1) && (
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/95 to-transparent flex flex-col items-center justify-end pb-8 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-4 max-w-md text-center px-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 shadow-sm animate-bounce">
                <Lock size={12} />
                {t('moreHidden', { n: tableData.length - (category === 'holding' ? 2 : 1) })}
              </div>
              <h3 className="text-sm font-bold text-[#141414]">{t('wantMore')}</h3>
              <p className="text-[11px] text-[#141414]/60 leading-tight">
                {t('unlockDesc')}
              </p>
            </div>
            <a 
              href={getUpsellLink(role)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-[#141414] text-white rounded-xl text-xs font-bold hover:bg-[#141414]/90 transition-all shadow-xl flex items-center gap-2 group scale-110"
            >
              {t('unlockButton')}
              <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

const INITIAL_BETTERLEAF_DATA: StockItem[] = [
  // Holdings
  {
    symbol: 'TSM',
    name: 'Taiwan Semiconductor',
    price: 190.45,
    marketCap: '987B',
    weight: 15.5,
    upside: 25,
    forwardPe: 22.4,
    thesis: 'AI 晶片代工龍頭，護城河極深，估值仍具吸引力。',
    category: 'holding'
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 228.12,
    marketCap: '3.45T',
    weight: 12.0,
    upside: 15,
    forwardPe: 31.2,
    thesis: '強大的生態系統與現金流，AI 手機換機潮預期。',
    category: 'holding'
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 175.30,
    marketCap: '2.15T',
    weight: 10.5,
    upside: 20,
    forwardPe: 21.5,
    thesis: '搜尋引擎壟斷地位，雲端業務增長強勁，AI 整合潛力。',
    category: 'holding'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    price: 415.20,
    marketCap: '3.10T',
    weight: 8.0,
    upside: 18,
    forwardPe: 34.5,
    thesis: 'Copilot 商業化進程領先，Azure 雲端市佔持續提升。',
    category: 'holding'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    price: 145.60,
    marketCap: '3.58T',
    weight: 7.5,
    upside: 30,
    forwardPe: 45.8,
    thesis: 'AI 算力基礎設施無可替代，Blackwell 需求極其旺盛。',
    category: 'holding'
  },
  // Watchlist
  {
    symbol: 'ASML',
    name: 'ASML Holding',
    price: 720.45,
    marketCap: '285B',
    upside: 40,
    forwardPe: 28.5,
    thesis: '光刻機壟斷者，近期因短期需求放緩回調，是長期佈局良機。',
    category: 'watchlist'
  },
  {
    symbol: 'MELI',
    name: 'MercadoLibre',
    price: 1850.30,
    marketCap: '92B',
    upside: 35,
    forwardPe: 42.1,
    thesis: '拉美電商與金融科技龍頭，增長速度極快，滲透率仍有空間。',
    category: 'watchlist'
  },
  {
    symbol: 'SHOP',
    name: 'Shopify',
    price: 105.20,
    marketCap: '135B',
    upside: 25,
    forwardPe: 65.4,
    thesis: '電商基礎設施首選，利潤率持續改善，小企業數位化紅利。',
    category: 'watchlist'
  },
  {
    symbol: 'PLTR',
    name: 'Palantir',
    price: 62.15,
    marketCap: '140B',
    upside: 15,
    forwardPe: 85.2,
    thesis: 'AIP 平台在企業端爆發式增長，數據分析護城河極深。',
    category: 'watchlist'
  }
];

export const BetterleafPortfolio: React.FC<{ role?: string }> = ({ role }) => {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminUploading, setIsAdminUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<StockItem[]>([]);

  useEffect(() => {
    if (uploadStatus !== 'idle') {
      const timer = setTimeout(() => setUploadStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  useEffect(() => {
    const holdingRef = doc(db, "apps", APP_ID, "global", "holding");
    const watchlistRef = doc(db, "apps", APP_ID, "global", "watchlist");
    
    let holdings: StockItem[] = [];
    let watchlist: StockItem[] = [];
    let holdingLoaded = false;
    let watchlistLoaded = false;

    const updateData = () => {
      if (holdingLoaded && watchlistLoaded) {
        const combined = [...holdings, ...watchlist];
        if (combined.length === 0) {
          setData(INITIAL_BETTERLEAF_DATA);
        } else {
          setData(combined);
        }
        setIsLoading(false);
      }
    };

    const unsubHolding = onSnapshot(holdingRef, (doc) => {
      if (doc.exists()) {
        holdings = (doc.data().items || []).map((item: any) => ({ 
          ...item, 
          category: 'holding',
          upside: typeof item.upside === 'number' ? Number((item.upside * 100).toFixed(1)) : item.upside 
        }));
      } else {
        holdings = [];
      }
      holdingLoaded = true;
      updateData();
    }, (error) => {
      console.error("Firestore Error in BetterleafPortfolio (holding):", error);
      holdingLoaded = true;
      updateData();
    });

    const unsubWatchlist = onSnapshot(watchlistRef, (doc) => {
      if (doc.exists()) {
        watchlist = (doc.data().items || []).map((item: any) => ({ 
          ...item, 
          category: 'watchlist',
          upside: typeof item.upside === 'number' ? Number((item.upside * 100).toFixed(1)) : item.upside
        }));
      } else {
        watchlist = [];
      }
      watchlistLoaded = true;
      updateData();
    }, (error) => {
      console.error("Firestore Error in BetterleafPortfolio (watchlist):", error);
      watchlistLoaded = true;
      updateData();
    });

    return () => {
      unsubHolding();
      unsubWatchlist();
    };
  }, []);

  const syncStockData = async (id: string, symbol: string) => {
    if (!symbol) return;
    try {
      const res = await fetchMarketData([symbol]);
      if (res.data && res.data.length > 0) {
        const mData = res.data[0];
        setEditingData(prev => prev.map(d => d.id === id ? { 
          ...d, 
          name: mData.name || d.name,
          price: mData.price || d.price,
          marketCap: mData.marketCap || d.marketCap,
          forwardPe: mData.forwardPe || d.forwardPe
        } : d));
      }
    } catch (error) {
      console.error("Error syncing stock data:", error);
    }
  };

  const handleSaveData = async () => {
    if (role !== 'admin') return;
    setIsAdminUploading(true);
    setUploadStatus('idle');
    try {
      let syncedData = [...editingData];
      
      // Attempt to sync with market data, but don't block save if it fails
      try {
        const allSymbols = editingData.map(d => d.symbol).filter(s => s !== '');
        if (allSymbols.length > 0) {
          const marketDataRes = await fetchMarketData(allSymbols);
          if (marketDataRes && marketDataRes.data) {
            syncedData = editingData.map(d => {
              const mData = marketDataRes.data.find((m: any) => m.symbol === d.symbol);
              if (mData) {
                return {
                  ...d,
                  name: mData.name || d.name,
                  price: mData.price || d.price,
                  marketCap: mData.marketCap || d.marketCap,
                  forwardPe: mData.forwardPe || d.forwardPe
                };
              }
              return d;
            });
          }
        }
      } catch (syncError) {
        console.warn("Market sync failed during save, saving manual edits only:", syncError);
      }

      const holdingRef = doc(db, "apps", APP_ID, "global", "holding");
      const watchlistRef = doc(db, "apps", APP_ID, "global", "watchlist");
      
      // Sanitize data: remove 'id' and any undefined fields
      const sanitize = (item: StockItem) => {
        const { id, ...rest } = item;
        return Object.fromEntries(
          Object.entries(rest).filter(([_, v]) => v !== undefined)
        );
      };

      const holdingItems = syncedData.filter(d => d.category === 'holding').map(item => {
        const sanitized = sanitize(item);
        return { ...sanitized, upside: typeof sanitized.upside === 'number' ? sanitized.upside / 100 : sanitized.upside };
      });
      const watchlistItems = syncedData.filter(d => d.category === 'watchlist').map(item => {
        const sanitized = sanitize(item);
        return { ...sanitized, upside: typeof sanitized.upside === 'number' ? sanitized.upside / 100 : sanitized.upside };
      });

      const commonData = {
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'admin'
      };

      await Promise.all([
        setDoc(holdingRef, { ...commonData, items: holdingItems }),
        setDoc(watchlistRef, { ...commonData, items: watchlistItems })
      ]);
      setIsEditing(false);
      setUploadStatus('success');
    } catch (error) {
      console.error("Admin save failed:", error);
      setUploadStatus('error');
      alert(t('saveFailed'));
    } finally {
      setIsAdminUploading(false);
    }
  };

  const holdings = (isEditing ? editingData : data).filter(d => d.category === 'holding');
  const watchlist = (isEditing ? editingData : data).filter(d => d.category === 'watchlist');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#141414] p-6 md:p-10 text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 md:space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
              {t('exclusiveInsights')}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter">{t('betterleafTitle')}</h1>
            <p className="text-white/60 max-w-md text-xs md:text-sm leading-relaxed">
              {t('betterleafDesc')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-sm">
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/40 mb-1">{t('portfolioValue')}</p>
              <p className="text-xl md:text-2xl font-mono font-bold">{formatCurrency(2450000, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-sm">
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/40 mb-1">{t('avgUpside')}</p>
              <p className="text-xl md:text-2xl font-mono font-bold text-emerald-400">+24.5%</p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] -ml-32 -mb-32" />
        
        <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
          {uploadStatus === 'success' && <span className="text-[10px] text-emerald-400 font-bold animate-fade-in bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ {t('savedSuccessfully')}</span>}
          {uploadStatus === 'error' && <span className="text-[10px] text-red-400 font-bold animate-fade-in bg-red-500/10 px-2 py-0.5 rounded-full">✕ {t('operationFailed')}</span>}
          
          <div className="flex items-center gap-2">
            {role === 'admin' && (
              <button 
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    setEditingData(data.map(item => ({ 
                      ...JSON.parse(JSON.stringify(item)), 
                      id: Math.random().toString(36).substr(2, 9) 
                    })));
                    setIsEditing(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isEditing ? <X size={16} /> : <Edit2 size={16} />}
                <span className="text-xs font-bold">{isEditing ? t('cancelEdit') : t('editData')}</span>
              </button>
            )}
            {isEditing && (
              <button 
                onClick={handleSaveData}
                disabled={isAdminUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isAdminUploading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span className="text-xs font-bold">{t('saveChanges')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="space-y-8">
        <StockTable 
          title={t('currentHoldings')} 
          icon={TrendingUp} 
          tableData={holdings} 
          showWeight 
          category="holding"
          isEditing={isEditing}
          editingData={editingData}
          setEditingData={setEditingData}
          syncStockData={syncStockData}
          role={role}
          isLoading={isLoading}
          t={t}
        />
        
        <StockTable 
          title={t('watchlistTitle')} 
          icon={Eye} 
          tableData={watchlist} 
          category="watchlist"
          isEditing={isEditing}
          editingData={editingData}
          setEditingData={setEditingData}
          syncStockData={syncStockData}
          role={role}
          isLoading={isLoading}
          t={t}
        />
        
        {/* Disclaimer */}
        <div className="px-6 py-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl">
          <p className="text-[11px] text-amber-800/70 leading-relaxed text-center italic">
            免責聲明：僅為好葉個人操作觀點，不構成投資建議。投資有風險，先求知再投資，才能有效增長財富。
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-[#141414]/5 rounded-2xl p-6 border border-[#141414]/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white border border-[#141414]/10 flex items-center justify-center shadow-sm">
            <Target className="text-[#141414]" size={20} />
          </div>
          <div>
            <p className="text-sm font-bold">{t('unlockStrategy')}</p>
            <p className="text-[10px] text-[#141414]/60">{t('joinCommunity')}</p>
          </div>
        </div>
        <a 
          href="https://www.skool.com/betterleaf-mvi/classroom/26370fe9?md=dede91a35a6b4465b747a1b2958416a0"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-xl text-xs font-bold hover:bg-[#141414]/90 transition-colors"
        >
          <ExternalLink size={14} />
          {t('goToCommunity')}
        </a>
      </div>
    </motion.div>
  );
};
