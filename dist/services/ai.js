"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAI = askAI;
exports.askAIChat = askAIChat;
const genai_1 = require("@google/genai");
function getAI() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
        throw new Error("AI_API_KEY is not defined");
    }
    return new genai_1.GoogleGenAI({ apiKey });
}
async function askAI(message, context) {
    const ai = getAI();
    // Limitar contexto para evitar exceso de tokens
    const limitedContext = context.slice(-5);
    const prompt = `
Eres un asistente profesional de bienestar emocional.

INSTRUCCIONES:
- Responde con un mensaje corto empático (máximo 2 líneas).
- Luego sugiere EXACTAMENTE 2 actividades prácticas.
- Responde SOLO en JSON válido.
- No agregues texto fuera del JSON.

Formato obligatorio:
{
  "message": "texto corto empático",
  "tasks": [
    {
      "title": "título corto",
      "description": "descripción breve"
    },
    {
      "title": "título corto",
      "description": "descripción breve"
    }
  ]
}

Contexto previo:
${limitedContext.join("\n")}

Usuario:
${message}
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            config: {
                responseMimeType: "application/json",
                maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS || "1000", 10),
                temperature: 0.7
            }
        });
        // Obtener texto de forma segura
        let text = response.text ??
            response.candidates?.[0]?.content?.parts?.[0]?.text ??
            "";
        // Limpiar markdown si aparece
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        // Extraer JSON válido si la IA agrega texto extra
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }
        console.log("Raw AI response:", text);
        const parsed = JSON.parse(text);
        // Validación flexible de estructura
        if (typeof parsed.message !== "string" ||
            !Array.isArray(parsed.tasks) ||
            parsed.tasks.length === 0) {
            console.error("AI Response missing message or tasks:", parsed);
            throw new Error("Invalid AI response structure");
        }
        // Asegurar que cada tarea tenga lo necesario
        parsed.tasks = parsed.tasks.filter(t => typeof t?.title === "string" && typeof t?.description === "string");
        if (parsed.tasks.length === 0) {
            throw new Error("No valid tasks found in AI response");
        }
        return parsed;
    }
    catch (error) {
        console.error("AI Service error:", error.message || error);
        // Fallback seguro si falla la IA
        return {
            message: "Parece que estás pasando por un momento difícil. Aquí tienes dos pequeñas actividades que podrían ayudarte.",
            tasks: [
                {
                    title: "Respiración profunda",
                    description: "Respira profundamente durante 2 minutos, inhalando por la nariz y exhalando lentamente."
                },
                {
                    title: "Pequeña caminata",
                    description: "Si puedes, da una caminata corta de 5 minutos para despejar tu mente."
                }
            ]
        };
    }
}
async function askAIChat(message, context) {
    const ai = getAI();
    // Limitar contexto para evitar exceso de tokens
    const limitedContext = context.slice(-5);
    const prompt = `
Eres un asistente profesional de bienestar emocional.

INSTRUCCIONES:
- Responde con un mensaje mas largo empático de varias lineas. QUE NO SUGIERA ACTIVIDADES.
- Responde SOLO en JSON válido.
- No agregues texto fuera del JSON.

Formato obligatorio:
{
  "message": "texto largo empático"
}

Contexto previo:
${limitedContext.join("\n")}

Usuario:
${message}
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            config: {
                responseMimeType: "application/json",
                maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS || "1000", 10),
                temperature: 0.7
            }
        });
        // Obtener texto de forma segura
        let text = response.text ??
            response.candidates?.[0]?.content?.parts?.[0]?.text ??
            "";
        // Limpiar markdown si aparece
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        // Extraer JSON válido si la IA agrega texto extra
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }
        const parsed = JSON.parse(text);
        // Validación fuerte de estructura
        if (typeof parsed.message !== "string") {
            throw new Error("Invalid AI response structure");
        }
        return parsed;
    }
    catch (error) {
        console.error("AI Service error in Chat:", error);
        // Fallback seguro si falla la IA
        return {
            message: "Entiendo lo que me dices. Estoy aquí para escucharte y acompañarte en este momento. A veces hablarlo ayuda a poner las cosas en perspectiva.",
        };
    }
}
