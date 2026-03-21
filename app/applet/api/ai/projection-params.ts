import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 60; // Set max duration to 60 seconds for AI tasks

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { portfolio, stats } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const prompt = `As an expert AI financial strategist and macroeconomist, analyze this investment portfolio and its historical performance to provide parameters for a sophisticated 10-year Monte Carlo growth simulation.

Portfolio Allocations:
${JSON.stringify(portfolio, null, 2)}

Historical Performance (Last 10 Years):
- Annualized Return (CAGR): ${(stats.cagr * 100).toFixed(2)}%
- Volatility (Std Dev): ${(stats.stdDev * 100).toFixed(2)}%
- Benchmark CAGR (SPY): ${(stats.benchmarkCagr * 100).toFixed(2)}%
- Benchmark Volatility: ${(stats.benchmarkStdDev * 100).toFixed(2)}%

Current Market Context: March 2026.
Consider:
1. The specific assets in the portfolio (e.g., Tech heavy, Value, Bonds, etc.) and their long-term growth potential.
2. Historical performance vs Benchmark. The historical CAGR is a strong indicator of the portfolio's quality; do not deviate significantly from it unless there are clear macroeconomic or sector-specific headwinds.
3. Potential market trends for the next 10 years (AI revolution, energy transition, demographic shifts, etc.).

Provide the following parameters for the simulation:
- expectedReturn: The expected annual return (as a decimal, e.g., 0.12 for 12%).
- volatility: The expected annual volatility (as a decimal, e.g., 0.18 for 18%).
- benchmarkExpectedReturn: Expected annual return for SPY (as a decimal).
- benchmarkVolatility: Expected annual volatility for SPY (as a decimal).
- marketSentiment: A short string describing the 10-year outlook (e.g., "Bullish", "Neutral", "Cautious").
- reasoning: 以繁體中文提供簡潔、直白的分析。請具備「批評性思維」，從以下角度切入：科技趨勢、未來發展、國際局勢、及組合的「被顛覆性」。避免冗長贅述，重點在於對組合潛在風險與機會的犀利洞察。請勿在文字中提及具體的百分比數字。

Return ONLY a JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    let rawText = response.text || "{}";
    
    // Remove markdown code blocks if present
    if (rawText.startsWith("\`\`\`json")) {
      rawText = rawText.replace(/^\`\`\`json\n/, "").replace(/\n\`\`\`$/, "");
    } else if (rawText.startsWith("\`\`\`")) {
      rawText = rawText.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");
    }

    res.status(200).json(JSON.parse(rawText));
  } catch (error: any) {
    console.error("AI Projection Error:", error);
    res.status(500).json({ error: error.message || "AI projection failed" });
  }
}
