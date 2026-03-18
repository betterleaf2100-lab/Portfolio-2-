import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Simple in-memory cache for Vercel (may be cleared on cold starts)
const historicalCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // Set Edge Cache Control (1 hour)
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

  const symbolsStr = req.query.symbols as string;
  const period = (req.query.period as string) || "1y";

  if (!symbolsStr) {
    return res.status(400).json({ error: "Symbols are required" });
  }

  const symbolList = Array.from(new Set(symbolsStr.split(",").map(s => s.trim().toUpperCase())));
  const now = Date.now();
  
  try {
    const results = await Promise.all(symbolList.map(async (symbol) => {
      const cacheKey = `${symbol}_${period}`;
      const cached = historicalCache.get(cacheKey);
      
      if (cached && (now - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
      }

      try {
        const end = new Date();
        const start = new Date();
        if (period === "1y") start.setFullYear(end.getFullYear() - 1);
        else if (period === "3y") start.setFullYear(end.getFullYear() - 3);
        else if (period === "5y") start.setFullYear(end.getFullYear() - 5);
        else if (period === "10y") start.setFullYear(end.getFullYear() - 10);
        else if (period === "max") start.setFullYear(end.getFullYear() - 30);
        else if (period === "ytd") start.setMonth(0, 1);
        else start.setFullYear(end.getFullYear() - 1);

        const chartResult = await yahooFinance.chart(symbol, {
          period1: start,
          period2: end,
          interval: "1d"
        });

        const historical = chartResult.quotes.map(q => ({
          date: q.date,
          adjClose: q.adjclose,
          close: q.close,
          high: q.high,
          low: q.low,
          open: q.open,
          volume: q.volume
        }));

        const result = { symbol, data: historical };
        historicalCache.set(cacheKey, { data: result, timestamp: now });
        return result;
      } catch (err) {
        return { symbol, data: [], error: String(err) };
      }
    }));

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
}
