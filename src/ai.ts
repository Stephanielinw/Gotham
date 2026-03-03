import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const callAI = async (prompt: string, systemPrompt: string, maxTokens: number = 1000) => {
    // The Gemini API key is injected by Vite's define or environment variables.
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error("GEMINI_API_KEY is missing.");
        throw new Error("API Key Missing: Please ensure GEMINI_API_KEY is set.");
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    try {
        const response: GenerateContentResponse = await genAI.models.generateContent({
            model: "gemini-3.1-pro-preview", 
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: maxTokens,
                temperature: 0.8,
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("Empty response from AI");
        }
        return text;
    } catch (error: any) {
        console.error("AI Call Error:", error);
        
        if (error.message?.includes("fetch")) {
            throw new Error("网络连接失败 (Failed to fetch). 请检查网络连接。");
        }
        
        if (error.message?.includes("API key not valid")) {
            throw new Error("API 密钥无效 (Invalid API Key).");
        }

        throw new Error(`AI 呼叫失败: ${error.message || "未知错误"}`);
    }
};
