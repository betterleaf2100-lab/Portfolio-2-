import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

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

  const symbols = req.query.symbols as string;
  const period = (req.query.period as string) || "1y";

  if (!symbols) {
    return res.status(400).json({ error: "Symbols are required" });
  }

  const symbolList = symbols.split(",");
  
  try {
    const results = await Promise.all(symbolList.map(async (symbol) => {
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

        const historical = await yahooFinance.historical(symbol, {
          period1: start,
          period2: end,
          interval: "1d"
        });

        return { symbol, data: historical };
      } catch (err) {
        return { symbol, data: [], error: String(err) };
      }
    }));

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
}
