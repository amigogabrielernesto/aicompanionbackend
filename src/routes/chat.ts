import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createSupabaseClient } from "../supabase";
import { generateEmbedding } from "../services/embedding";
import { askAI } from "../services/ai";
import activity from "./activity";

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Send a message to the AI assistant
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Me siento estresado por el trabajo"
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */



const router = Router();

router.post("/", authenticate, async (req: AuthRequest, res) => {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
    }

    const supabase = createSupabaseClient(req.accessToken!);

    try {
        // 1️⃣ Guardar mensaje usuario
        const { data: userMessage, error: insertError } = await supabase
            .from("chat_messages")
            .insert({
                user_id: req.userId,
                role: "user",
                content: message,
            })
            .select()
            .single();

        if (insertError) {
            console.error("DB User Message Insert Error:", insertError);
            return res.status(500).json({
                error: "Failed to save user message",
                details: insertError.message,
            });
        }

        // 2️⃣ Generar embedding
        let embedding;
        try {
            embedding = await generateEmbedding(message);
        } catch (embError: any) {
            console.error("Embedding Generation Error:", embError);
            return res.status(500).json({
                error: "Failed to generate embedding",
                details: embError.message,
            });
        }

        // 3️⃣ Actualizar embedding
        const { error: updateError } = await supabase
            .from("chat_messages")
            .update({ embedding })
            .eq("id", userMessage.id);

        if (updateError) {
            console.error("DB Update Embedding Error:", updateError);
        }

        // 4️⃣ Buscar contexto similar
        const { data: contextMessages, error: rpcError } = await supabase.rpc(
            "match_chat_messages",
            {
                query_embedding: embedding,
                match_threshold: 0.75,
                match_count: 5,
            }
        );

        if (rpcError) {
            console.error("DB Context RPC Error:", rpcError);
        }

        const context = contextMessages?.map((m: any) => m.content) || [];

        // 5️⃣ Llamar AI
        let aiResponse;
        try {
            aiResponse = await askAI(message, context);
        } catch (aiError: any) {
            console.error("AI Service Error:", aiError);
            return res.status(500).json({
                error: "AI Service failed",
                details: aiError.message,
            });
        }

        // 6️⃣ Guardar mensaje AI
        const { error: aiInsertError } = await supabase
            .from("chat_messages")
            .insert({
                user_id: req.userId,
                role: "assistant",
                content: aiResponse.message,
            });

        if (aiInsertError) {
            console.error("DB AI Message Insert Error:", aiInsertError);
        }

        // 7️⃣ Guardar actividades sugeridas (versión optimizada)
        if (aiResponse.tasks && aiResponse.tasks.length > 0) {

            const taskTitles = aiResponse.tasks.map(t => t.title);

            // 1️⃣ Insertar activity types si no existen
            const { error: upsertError } = await supabase
                .from("activity_types_catalog")
                .upsert(
                    taskTitles.map(name => ({ name })),
                    { onConflict: "name" }
                );

            if (upsertError) {
                console.error("ActivityTypes Upsert Error:", upsertError);
            }

            // 2️⃣ Obtener IDs de todos los activity types
            const { data: activityTypes, error: selectError } = await supabase
                .from("activity_types_catalog")
                .select("id, name")
                .in("name", taskTitles);

            if (selectError) {
                console.error("ActivityTypes Select Error:", selectError);
                return;
            }

            // Crear mapa name -> id
            const typeMap = new Map(
                activityTypes.map(t => [t.name, t.id])
            );

            // 3️⃣ Crear actividades
            const activities = aiResponse.tasks.map(task => ({
                user_id: req.userId,
                activity_type_id: typeMap.get(task.title),
                description: task.description,
                duration_minutes: null
            }));

            // 4️⃣ Insertar actividades
            const { error: activitiesError } = await supabase
                .from("activities")
                .insert(activities);

            if (activitiesError) {
                console.error("Activities Insert Error:", activitiesError);
            }
        }

        // 8️⃣ Respuesta al frontend
        return res.json({
            message: aiResponse.message,
            tasks: aiResponse.tasks,
        });

    } catch (error: any) {
        console.error("Unexpected Chat error:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: error.message,
        });
    }
});

export default router;