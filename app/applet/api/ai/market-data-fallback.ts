import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 60; // Set max duration to 60 seconds for AI tasks

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { symbols } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    res.status(200).json(JSON.parse(geminiResponse.text || "{}"));
  } catch (error: any) {
    console.error("AI Fallback Error:", error);
    res.status(500).json({ error: error.message || "AI fallback failed" });
  }
}
