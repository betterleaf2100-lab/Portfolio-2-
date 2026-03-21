import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 60; // Set max duration to 60 seconds for AI tasks

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { base64Image } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
              text: "Extract the investment portfolio or trade information from this screenshot. For each asset, identify: symbol, name, quantity, price (average cost), currency, estimated exchange rate to USD (fxRateToUsd), sector, country, and asset type. \n\nIMPORTANT: For the 'symbol' field, ensure it is compatible with Yahoo Finance. If it is a non-US stock, append the correct suffix (e.g., .HK for Hong Kong, .KL for Malaysia, .SI for Singapore, .TW for Taiwan, .SS for Shanghai, .SZ for Shenzhen, .TO for Toronto, etc.) based on the exchange or country. \n\nSTANDARDIZATION: \n- Asset Types (MUST be one of these): Stock, ETF, Fund, Crypto, Bond, Others.\n- Sectors (Classify ALL assets including ETFs/Crypto by their underlying nature): Technology, Financial Services, Healthcare, Consumer Cyclical, Consumer Defensive, Communication Services, Industrials, Energy, Basic Materials, Real Estate, Utilities, Digital Assets, Others.\n- Countries: USA, Taiwan, Hong Kong, China, Japan, Singapore, UK, Germany, Global.\n\nNote: For ETFs like QQQ, the sector should be 'Technology'. For Bitcoin or Crypto, the sector should be 'Digital Assets' or 'Financial Services'. Do not just put 'Others' for ETFs.\n\nTRADE DETECTION: If the screenshot shows a single transaction, determine if it is a 'BUY' or 'SELL'. Note that '平倉' (Close position) or '賣出' (Sell) should be identified as 'SELL'. '開倉' (Open position) or '買入' (Buy) should be identified as 'BUY'. If both '開倉' and '平倉' are present in a history view, it usually represents a closed trade, so identify the '平倉' part as a 'SELL' transaction with the corresponding price and quantity.\n\nOnly extract what is visible in the image. Do not search for external market data like P/E or Beta here. Return the data in a structured format.",
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
    res.status(200).json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("AI Extract Error:", error);
    res.status(500).json({ error: error.message || "AI extraction failed" });
  }
}
