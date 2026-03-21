import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60; // Set max duration to 60 seconds for AI tasks

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { portfolioSummary } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    res.status(200).json({ text: response.text || "分析報告生成失敗。" });
  } catch (error: any) {
    console.error("AI Analyze Error:", error);
    res.status(500).json({ error: error.message || "AI analysis failed" });
  }
}
