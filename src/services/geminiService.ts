import { GoogleGenAI, Type } from "@google/genai";

export interface PortfolioItem {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  allocation: number;
  currency: string;
  fxRateToUsd: number;
  sector: string;
  country: string;
  assetType: string; // e.g., 'Stock', 'ETF', 'Fund', 'Crypto'
  forwardPe?: number;
  changePercent?: number;
  marketCap?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'BUY' | 'SELL' | 'HOLDING_UPDATE';
  symbol: string;
  quantity: number;
  price: number;
  total: number;
  currency: string;
  fxRateToUsd: number;
  notes?: string;
}

export const extractPortfolioFromImage = async (base64Image: string) => {
  const response = await fetch('/api/ai/extract-portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image })
  });

  if (!response.ok) {
    throw new Error('Failed to extract portfolio from image');
  }

  return await response.json();
};

export const fetchMarketData = async (symbols: string[]) => {
  if (symbols.length === 0) return { spyPrice: 0, data: [] };
  
  try {
    const response = await fetch(`/api/market-data?symbols=${symbols.join(',')}`);
    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching market data from API:", error);
    // Fallback to AI proxy if API fails
    const fallbackResponse = await fetch('/api/ai/market-data-fallback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols })
    });

    if (!fallbackResponse.ok) {
      throw new Error('Fallback market data fetch failed');
    }

    return await fallbackResponse.json();
  }
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]) => {
  const portfolioSummary = portfolio
    .filter(p => p.quantity > 0)
    .map(p => ({
      symbol: p.symbol,
      name: p.name,
      valueUsd: p.quantity * p.currentPrice * p.fxRateToUsd,
      allocation: p.allocation,
      sector: p.sector,
      country: p.country,
      assetType: p.assetType,
      forwardPe: p.forwardPe,
      changePercent: p.changePercent
    }));

  const response = await fetch('/api/ai/analyze-portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolioSummary })
  });

  if (!response.ok) {
    return "分析報告生成失敗。";
  }

  const data = await response.json();
  return data.text || "分析報告生成失敗。";
};

export interface Allocation {
  symbol: string;
  weight: number;
  name?: string;
  forwardPe?: number;
}

export const getAIProjectionParams = async (portfolio: Allocation[], stats: any) => {
  const response = await fetch('/api/ai/projection-params', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolio, stats })
  });

  if (!response.ok) {
    throw new Error('Failed to get AI projection parameters');
  }

  return await response.json();
};
