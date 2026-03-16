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
}

export const extractPortfolioFromImage = async (base64Image: string) => {
  console.log("[API] Calling Gemini to extract portfolio from image...");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "Extract the investment portfolio or trade information from this screenshot. For each asset, identify: symbol, name, quantity, price (average cost), currency, estimated exchange rate to USD (fxRateToUsd), sector, country, and asset type. \n\nIMPORTANT: For the 'symbol' field, ensure it is compatible with Yahoo Finance. If it is a non-US stock, append the correct suffix (e.g., .HK for Hong Kong, .KL for Malaysia, .SI for Singapore, .TW for Taiwan, .SS for Shanghai, .SZ for Shenzhen, .TO for Toronto, etc.) based on the exchange or country. \n\nTRADE DETECTION: If the screenshot shows a single transaction, determine if it is a 'BUY' or 'SELL'. Note that '平倉' (Close position) or '賣出' (Sell) should be identified as 'SELL'. '開倉' (Open position) or '買入' (Buy) should be identified as 'BUY'. If both '開倉' and '平倉' are present in a history view, it usually represents a closed trade, so identify the '平倉' part as a 'SELL' transaction with the corresponding price and quantity.\n\nOnly extract what is visible in the image. Do not search for external market data like P/E or Beta here. Return the data in a structured format.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: "The type of information found: 'PORTFOLIO' for multiple holdings, or 'TRADE' for a single transaction.",
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                price: { type: Type.NUMBER },
                currentPrice: { type: Type.NUMBER },
                tradeType: { type: Type.STRING },
                date: { type: Type.STRING },
                currency: { type: Type.STRING },
                fxRateToUsd: { type: Type.NUMBER },
                sector: { type: Type.STRING },
                country: { type: Type.STRING },
                assetType: { type: Type.STRING },
                forwardPe: { type: Type.NUMBER, description: "Leave as 0 if not explicitly visible in image" },
                changePercent: { type: Type.NUMBER, description: "Daily change percentage, leave as 0 if not explicitly visible" }
              },
              required: ["symbol", "quantity", "price", "currency", "fxRateToUsd", "sector", "country", "assetType"]
            }
          }
        },
        required: ["type", "items"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const fetchMarketData = async (symbols: string[]) => {
  if (symbols.length === 0) return { spyPrice: 0, data: [] };
  
  console.log(`[API] Fetching market data for: ${symbols.join(', ')}`);
  try {
    const response = await fetch(`/api/market-data?symbols=${symbols.join(',')}`);
    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }
    const data = await response.json();
    console.log("[API] Market data received successfully");
    return data;
  } catch (error) {
    console.error("Error fetching market data from API:", error);
    // Fallback to Gemini if API fails
    console.log("[API] Falling back to Gemini for market data...");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `For the following stock symbols, provide the average of their current Forward P/E Ratio and Trailing P/E Ratio (PE Ratio), daily change percentage (regularMarketChangePercent), current market price in USD, and Market Cap (formatted as 1.2T, 500B, etc.). Symbols: ${symbols.join(', ')}. Return the average P/E in the 'forwardPe' field and daily change in 'changePercent'. Also provide the current price of SPY.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spyPrice: { type: Type.NUMBER },
            data: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  forwardPe: { type: Type.NUMBER },
                  changePercent: { type: Type.NUMBER },
                  price: { type: Type.NUMBER },
                  marketCap: { type: Type.STRING }
                },
                required: ["symbol", "forwardPe", "changePercent", "price", "marketCap"]
              }
            }
          },
          required: ["spyPrice", "data"]
        }
      }
    });
    return JSON.parse(geminiResponse.text || "{}");
  }
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]) => {
  console.log("[API] Calling Gemini to analyze portfolio...");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
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

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `As a professional investment advisor, analyze the following investment portfolio and provide a detailed report in Traditional Chinese (繁體中文). 

Portfolio Data:
${JSON.stringify(portfolioSummary, null, 2)}

Please cover the following aspects:
1. **整體評價**: 對當前組合的初步印象。
2. **多樣性分析**: 板塊、國家、資產類別的分配是否合理？是否過度集中？
3. **風險評估**: 考慮 P/E 值和今日漲跌情況，判斷組合的風險等級（激進、穩健、保守）。
4. **具體建議**: 針對目前的持倉，提供 3-5 個具體的優化建議。
5. **市場展望**: 結合當前市場趨勢（若有），提供操作方向。

格式要求：請使用清晰的標題和分點符號，語氣專業且具啟發性。`,
  });

  return response.text || "分析報告生成失敗。";
};

export interface Allocation {
  symbol: string;
  weight: number;
  name?: string;
  forwardPe?: number;
}

export const getAIProjectionParams = async (portfolio: Allocation[], stats: any) => {
  console.log("[API] Calling Gemini to get AI projection parameters...");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `As an AI financial analyst, analyze this investment portfolio and its historical performance to provide parameters for a 10-year Monte Carlo simulation.

Portfolio Allocations:
${JSON.stringify(portfolio, null, 2)}

Historical Performance (Last 10 Years):
- Annualized Return (CAGR): ${(stats.cagr * 100).toFixed(2)}%
- Volatility (Std Dev): ${(stats.stdDev * 100).toFixed(2)}%
- Benchmark CAGR (SPY): ${(stats.benchmarkCagr * 100).toFixed(2)}%
- Benchmark Volatility: ${(stats.benchmarkStdDev * 100).toFixed(2)}%

Current Market Context: March 2026.
Consider:
1. The specific assets in the portfolio (e.g., Tech heavy, Value, Bonds, etc.)
2. Historical performance vs Benchmark. The historical CAGR is a strong indicator of the portfolio's quality; do not deviate significantly from it unless there are clear macroeconomic or sector-specific headwinds.
3. Potential market trends for the next 10 years.

Provide the following parameters for the simulation:
- expectedReturn: The expected annual return (as a decimal, e.g., 0.12 for 12%).
- volatility: The expected annual volatility (as a decimal, e.g., 0.18 for 18%).
- benchmarkExpectedReturn: Expected annual return for SPY (as a decimal).
- benchmarkVolatility: Expected annual volatility for SPY (as a decimal).
- marketSentiment: A short string describing the 10-year outlook (e.g., "Bullish", "Neutral", "Cautious").
- reasoning: A brief explanation (in Traditional Chinese) of why these parameters were chosen based on the portfolio composition. IMPORTANT: Do not mention specific growth percentage numbers (e.g., "12%") in this text to avoid confusion with the simulation results. Focus on the logic and qualitative outlook.

Return ONLY a JSON object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expectedReturn: { type: Type.NUMBER },
          volatility: { type: Type.NUMBER },
          benchmarkExpectedReturn: { type: Type.NUMBER },
          benchmarkVolatility: { type: Type.NUMBER },
          marketSentiment: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        },
        required: ["expectedReturn", "volatility", "benchmarkExpectedReturn", "benchmarkVolatility", "marketSentiment", "reasoning"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
