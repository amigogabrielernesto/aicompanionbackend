import { GoogleGenAI } from "@google/genai";

// Helper to get initialized AI client
function getAI() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
        throw new Error("AI_API_KEY is not defined");
    }
    return new GoogleGenAI({ apiKey });
}

export async function generateEmbedding(text: string) {
    const ai = getAI();

    const result = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: [
            {
                role: "user",
                parts: [{ text }]
            }
        ]
    });

    return result.embeddings?.[0]?.values;
}