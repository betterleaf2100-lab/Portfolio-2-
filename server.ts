import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import YahooFinance from 'yahoo-finance2';

dotenv.config();

const yahooFinance = new YahooFinance();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple in-memory cache: { symbol: { data: any, timestamp: number } }
  const marketCache = new Map<string, { data: any, timestamp: number }>();
  const historicalCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for market data
  const HISTORICAL_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for historical data

  // Yahoo Finance API Proxy
  app.get("/api/market-data", async (req, res) => {
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

          console.log(`[API] Batch Quote for ${quote.symbol}: Price=${quote.regularMarketPrice}, tPE=${tPE || 'N/A'}, fPE=${fPE || 'N/A'}, AvgPE=${avgPe.toFixed(2)}, MarketCap=${quote.marketCap || 'N/A'}`);

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

      // Helper to format market cap
      function formatMarketCap(raw: number): string {
        if (!raw) return "N/A";
        if (raw >= 1e12) return (raw / 1e12).toFixed(2) + "T";
        if (raw >= 1e9) return (raw / 1e9).toFixed(2) + "B";
        if (raw >= 1e6) return (raw / 1e6).toFixed(2) + "M";
        return raw.toLocaleString();
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
        } catch (e) {
          console.error("Error fetching SPY price:", e);
        }
      }

      res.json({ spyPrice, data: results });
    } catch (error) {
      console.error("Yahoo Finance API Error:", error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Historical Data for Portfolio Visualizer
  app.get("/api/historical-data", async (req, res) => {
    const symbols = req.query.symbols as string;
    const period = (req.query.period as string) || "1y"; // Default 1 year

    if (!symbols) {
      return res.status(400).json({ error: "Symbols are required" });
    }

    const symbolList = Array.from(new Set(symbols.split(",").map(s => s.trim().toUpperCase())));
    const now = Date.now();
    
    try {
      const results = await Promise.all(symbolList.map(async (symbol) => {
        const cacheKey = `${symbol}_${period}`;
        const cached = historicalCache.get(cacheKey);
        
        if (cached && (now - cached.timestamp < HISTORICAL_CACHE_DURATION)) {
          return { symbol, data: cached.data };
        }

        try {
          // Calculate start date based on period
          const end = new Date();
          const start = new Date();
          if (period === "1y") start.setFullYear(end.getFullYear() - 1);
          else if (period === "3y") start.setFullYear(end.getFullYear() - 3);
          else if (period === "5y") start.setFullYear(end.getFullYear() - 5);
          else if (period === "10y") start.setFullYear(end.getFullYear() - 10);
          else if (period === "max") start.setFullYear(end.getFullYear() - 30); // 30 years as max
          else if (period === "ytd") start.setMonth(0, 1);
          else start.setFullYear(end.getFullYear() - 1);

          const historical = await yahooFinance.historical(symbol, {
            period1: start,
            period2: end,
            interval: "1d"
          });

          // Update Cache
          historicalCache.set(cacheKey, { data: historical, timestamp: now });

          return { symbol, data: historical };
        } catch (err) {
          console.error(`Error fetching historical data for ${symbol}:`, err);
          return { symbol, data: [], error: String(err) };
        }
      }));

      res.json(results);
    } catch (error) {
      console.error("Historical Data API Error:", error);
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });

  // Batch Test API
  app.get("/api/batch-test", async (req, res) => {
    const symbols = req.query.symbols as string;
    if (!symbols) {
      return res.status(400).json({ error: "Symbols are required" });
    }

    const symbolList = symbols.split(",").map(s => s.trim().toUpperCase());
    
    try {
      console.log(`[Batch Test] Fetching data for: ${symbolList.join(', ')}`);
      const results = await yahooFinance.quote(symbolList);
      res.json({ 
        count: Array.isArray(results) ? results.length : 1,
        data: results 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // Historical Test API
  app.get("/api/historical-test", async (req, res) => {
    const symbol = req.query.symbol as string;
    const period = (req.query.period as string) || "1mo";
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    try {
      console.log(`[Historical Test] Fetching data for: ${symbol} (${period})`);
      const end = new Date();
      const start = new Date();
      if (period === "1mo") start.setMonth(end.getMonth() - 1);
      else if (period === "1y") start.setFullYear(end.getFullYear() - 1);
      else start.setMonth(end.getMonth() - 1);

      const results = await yahooFinance.historical(symbol, {
        period1: start,
        period2: end,
        interval: "1d"
      });
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
