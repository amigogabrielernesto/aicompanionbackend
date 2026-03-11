"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
const genai_1 = require("@google/genai");
// Helper to get initialized AI client
function getAI() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
        throw new Error("AI_API_KEY is not defined");
    }
    return new genai_1.GoogleGenAI({ apiKey });
}
async function generateEmbedding(text) {
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
