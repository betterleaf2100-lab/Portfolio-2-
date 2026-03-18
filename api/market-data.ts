import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Simple in-memory cache for Vercel (may be cleared on cold starts)
const marketCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function formatMarketCap(raw: number): string {
  if (!raw) return "N/A";
  if (raw >= 1e12) return (raw / 1e12).toFixed(2) + "T";
  if (raw >= 1e9) return (raw / 1e9).toFixed(2) + "B";
  if (raw >= 1e6) return (raw / 1e6).toFixed(2) + "M";
  return raw.toLocaleString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 設置 CORS 標頭
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Set Edge Cache Control (5 minutes)
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const symbolsStr = req.query.symbols as string;
  if (!symbolsStr) {
    return res.status(400).json({ error: "Symbols are required" });
  }

  const symbolList = Array.from(new Set(symbolsStr.split(",").map(s => s.trim().toUpperCase())));
  const now = Date.now();
  
  const results: any[] = [];
  const symbolsToFetch: string[] = [];

  // 1. Check Cache
  symbolList.forEach(symbol => {
    const cached = marketCache.get(symbol);
    if (cached && (now - cached.timestamp < CACHE_DURATION)) {
      results.push(cached.data);
    } else {
      symbolsToFetch.push(symbol);
    }
  });

  try {
    if (symbolsToFetch.length > 0) {
      // Use Batch Quote for all
      const quotes = await yahooFinance.quote(symbolsToFetch);
      const quoteArray = Array.isArray(quotes) ? quotes : [quotes];
      
      for (const quote of quoteArray) {
        if (!quote) continue;
        
        // Calculate Average PE: (Trailing + Forward) / 2
        const tPE = quote.trailingPE;
        const fPE = quote.forwardPE;
        let avgPe = 0;
        
        if (tPE && fPE) {
          avgPe = (tPE + fPE) / 2;
        } else {
          avgPe = tPE || fPE || 0;
        }

        const prunedData = {
          symbol: quote.symbol,
          price: quote.regularMarketPrice || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          forwardPe: avgPe,
          name: quote.longName || quote.shortName || quote.symbol,
          marketCap: formatMarketCap(quote.marketCap || 0),
          updatedAt: now
        };
        marketCache.set(quote.symbol, { data: prunedData, timestamp: now });
        results.push(prunedData);
      }
    }

    // Fetch SPY price (also cached)
    let spyPrice = 500;
    const cachedSpy = marketCache.get('SPY');
    if (cachedSpy && (now - cachedSpy.timestamp < CACHE_DURATION)) {
      spyPrice = cachedSpy.data.price;
    } else {
      try {
        const spyQuote: any = await yahooFinance.quote('SPY');
        spyPrice = spyQuote.regularMarketPrice || 500;
        marketCache.set('SPY', { data: { symbol: 'SPY', price: spyPrice }, timestamp: now });
      } catch (e) {}
    }

    res.status(200).json({ spyPrice, data: results });
  } catch (error) {
    console.error("Yahoo Finance API Error:", error);
    res.status(500).json({ error: "Failed to fetch market data" });
  }
}
