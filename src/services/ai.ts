import { GoogleGenAI } from "@google/genai";

function getAI() {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
        throw new Error("AI_API_KEY is not defined");
    }

    return new GoogleGenAI({ apiKey });
}

export type AITask = {
    title: string;
    description: string;
};

export type AIResponse = {
    message: string;
    tasks: AITask[];
};

export async function askAI(message: string, context: string[]): Promise<AIResponse> {
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
                maxOutputTokens: 400,
                temperature: 0.6
            }
        });

        // Obtener texto de forma segura
        let text =
            response.text ??
            response.candidates?.[0]?.content?.parts?.[0]?.text ??
            "";

        // Limpiar markdown si aparece
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        // Extraer JSON válido si la IA agrega texto extra
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }

        const parsed = JSON.parse(text) as AIResponse;

        // Validación fuerte de estructura
        if (
            typeof parsed.message !== "string" ||
            !Array.isArray(parsed.tasks) ||
            parsed.tasks.length !== 2 ||
            typeof parsed.tasks[0]?.title !== "string" ||
            typeof parsed.tasks[0]?.description !== "string"
        ) {
            throw new Error("Invalid AI response structure");
        }

        return parsed;
    } catch (error) {
        console.error("AI Service error:", error);

        // Fallback seguro si falla la IA
        return {
            message:
                "Parece que estás pasando por un momento difícil. Aquí tienes dos pequeñas actividades que podrían ayudarte.",
            tasks: [
                {
                    title: "Respiración profunda",
                    description:
                        "Respira profundamente durante 2 minutos, inhalando por la nariz y exhalando lentamente."
                },
                {
                    title: "Pequeña caminata",
                    description:
                        "Si puedes, da una caminata corta de 5 minutos para despejar tu mente."
                }
            ]
        };
    }
}