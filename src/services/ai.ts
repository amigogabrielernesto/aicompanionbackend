import { GoogleGenAI } from "@google/genai";

/* =========================
   CONFIG
========================= */
const AI_CONFIG = {
    temperature: 0.7,
    maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS || "1000", 10),
    model: "gemini-2.0-flash",
    timeoutMs: 8000,
};

/* =========================
   TYPES
========================= */
export type AITask = {
    title: string;
    description: string;
};

export type AIResponse = {
    message: string;
    tasks: AITask[];
    detectedUserTask: string | null;
};

export type AIChatResponse = {
    message: string;
};

/* =========================
   INIT
========================= */
function getAI() {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
        throw new Error("AI_API_KEY is not defined");
    }

    return new GoogleGenAI({ apiKey });
}

/* =========================
   TIMEOUT HELPER
========================= */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), ms);

    return promise.finally(() => clearTimeout(timeout));
}

/* =========================
   ASK AI (WITH TASKS)
========================= */
export async function askAI(
    message: string,
    context: string[]
): Promise<AIResponse> {
    const ai = getAI();

    const limitedContext = context.slice(-5);

    const prompt = `
Responde en JSON:

{
  "message": "máx 2 líneas empáticas",
  "tasks": [
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ],
  "detectedUserTask": "..." o null
}

Reglas:
- Exactamente 2 tareas
- Mensaje corto y empático
- Detecta si el usuario mencionó una tarea personal
- Sin texto fuera del JSON

Contexto:
${limitedContext.join("\n")}

Usuario: ${message}
`;

    try {
        const response = await withTimeout(
            ai.models.generateContent({
                model: AI_CONFIG.model,
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                config: {
                    temperature: AI_CONFIG.temperature,
                    maxOutputTokens: AI_CONFIG.maxOutputTokens,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            tasks: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        description: { type: "string" },
                                    },
                                    required: ["title", "description"],
                                },
                            },
                            detectedUserTask: {
                                type: ["string", "null"],
                            },
                        },
                        required: ["message", "tasks", "detectedUserTask"],
                    },
                },
            }),
            AI_CONFIG.timeoutMs
        );

        const data = response.response as AIResponse;

        /* =========================
           VALIDATIONS
        ========================= */

        if (!data || typeof data.message !== "string") {
            throw new Error("Invalid AI response: missing message");
        }

        if (!Array.isArray(data.tasks)) {
            throw new Error("Invalid AI response: tasks must be array");
        }

        // Filtrar tareas válidas
        let tasks = data.tasks.filter(
            (t) =>
                t &&
                typeof t.title === "string" &&
                typeof t.description === "string"
        );

        // Asegurar exactamente 2 tareas
        if (tasks.length >= 2) {
            tasks = tasks.slice(0, 2);
        } else {
            throw new Error("Not enough valid tasks");
        }

        return {
            message: data.message,
            tasks,
            detectedUserTask: data.detectedUserTask ?? null,
        };
    } catch (error: any) {
        console.error("AI Service error:", {
            message: error?.message,
            stack: error?.stack,
        });

        /* =========================
           FALLBACK
        ========================= */
        return {
            message:
                "Parece que estás pasando por un momento difícil. Aquí tienes dos pequeñas actividades que podrían ayudarte.",
            tasks: [
                {
                    title: "Respiración profunda",
                    description:
                        "Respira profundamente durante 2 minutos, inhalando por la nariz y exhalando lentamente.",
                },
                {
                    title: "Pequeña caminata",
                    description:
                        "Da una caminata corta de 5 minutos para despejar tu mente.",
                },
            ],
            detectedUserTask: null,
        };
    }
}

/* =========================
   CHAT ONLY (NO TASKS)
========================= */
export async function askAIChat(
    message: string,
    context: string[]
): Promise<AIChatResponse> {
    const ai = getAI();

    const limitedContext = context.slice(-5);

    const prompt = `
Responde en JSON:

{
  "message": "respuesta empática larga (sin sugerir actividades)"
}

Reglas:
- Mensaje empático
- Varias líneas
- No sugerir tareas
- Sin texto fuera del JSON

Contexto:
${limitedContext.join("\n")}

Usuario: ${message}
`;

    try {
        const response = await withTimeout(
            ai.models.generateContent({
                model: AI_CONFIG.model,
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                config: {
                    temperature: AI_CONFIG.temperature,
                    maxOutputTokens: AI_CONFIG.maxOutputTokens,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                        required: ["message"],
                    },
                },
            }),
            AI_CONFIG.timeoutMs
        );

        const data = response.response as AIChatResponse;

        if (!data || typeof data.message !== "string") {
            throw new Error("Invalid AI chat response");
        }

        return data;
    } catch (error: any) {
        console.error("AI Chat error:", {
            message: error?.message,
            stack: error?.stack,
        });

        return {
            message:
                "Entiendo lo que estás pasando. Estoy aquí para escucharte y acompañarte en este momento. A veces compartirlo puede ayudar a verlo con más claridad.",
        };
    }
}