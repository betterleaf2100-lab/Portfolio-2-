import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

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

  const symbols = req.query.symbols as string;
  if (!symbols) {
    return res.status(400).json({ error: "Symbols are required" });
  }

  const symbolList = symbols.split(",");
  
  try {
    const results = await Promise.all(symbolList.map(async (symbol) => {
      try {
        let quote: any = {};
        let summary: any = null;
        let errors: string[] = [];

        try {
          quote = await yahooFinance.quote(symbol);
          if (!quote || Object.keys(quote).length === 0) {
            const searchResult = await yahooFinance.search(symbol);
            if (searchResult.quotes && searchResult.quotes.length > 0) {
              const bestMatch: any = searchResult.quotes.find((q: any) => q.symbol.startsWith(symbol + ".") || q.symbol === symbol) || searchResult.quotes[0];
              quote = await yahooFinance.quote(bestMatch.symbol);
              symbol = bestMatch.symbol;
            }
          }
        } catch (e: any) {
          try {
            const searchResult = await yahooFinance.search(symbol);
            if (searchResult.quotes && searchResult.quotes.length > 0) {
              const bestMatch: any = searchResult.quotes.find((q: any) => q.symbol.startsWith(symbol + ".") || q.symbol === symbol) || searchResult.quotes[0];
              quote = await yahooFinance.quote(bestMatch.symbol);
              symbol = bestMatch.symbol;
            } else {
              errors.push(`Quote Error: ${e.message || String(e)}`);
            }
          } catch (searchErr) {
            errors.push(`Quote Error: ${e.message || String(e)}`);
          }
        }

        try {
          summary = await yahooFinance.quoteSummary(symbol, { 
            modules: ['defaultKeyStatistics', 'price', 'summaryDetail'] 
          });
        } catch (e: any) {
          errors.push(`Summary Error: ${e.message || String(e)}`);
        }

        const trailingPE = quote?.trailingPE || summary?.summaryDetail?.trailingPE || 0;
        const forwardPE = quote?.forwardPE || summary?.summaryDetail?.forwardPE || 0;
        let calculatedPe = 0;
        
        if (trailingPE > 0 && forwardPE > 0) {
          calculatedPe = (trailingPE + forwardPE) / 2;
        } else if (trailingPE > 0) {
          calculatedPe = trailingPE;
        } else if (forwardPE > 0) {
          calculatedPe = forwardPE;
        }

        return {
          symbol,
          price: quote?.regularMarketPrice || summary?.price?.regularMarketPrice || 0,
          forwardPe: calculatedPe,
          beta: summary?.defaultKeyStatistics?.beta || summary?.summaryDetail?.beta || 0,
          name: quote?.longName || quote?.shortName || summary?.price?.longName || symbol,
          error: errors.length > 0 ? errors.join("; ") : null
        };
      } catch (err: any) {
        return { symbol, price: 0, forwardPe: 0, beta: 0, name: symbol, error: err.message || String(err) };
      }
    }));

    let spyPrice = 500;
    try {
      const spyQuote: any = await yahooFinance.quote('SPY');
      spyPrice = spyQuote.regularMarketPrice || 500;
    } catch (e) {}

    res.status(200).json({ spyPrice, data: results });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch market data" });
  }
}
