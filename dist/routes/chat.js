"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const embedding_1 = require("../services/embedding");
const ai_1 = require("../services/ai");
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
const router = (0, express_1.Router)();
router.post("/", auth_1.authenticate, async (req, res) => {
    let { message, conversation_id } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    try {
        // Si no se provee un conversation_id, buscaremos el último del usuario activo
        if (!conversation_id || conversation_id === "undefined" || conversation_id === "null") {
            const { data: latestChat, error: latestChatErr } = await supabase
                .from("chat_messages")
                .select("conversation_id")
                .eq("user_id", req.userId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (latestChat && latestChat.conversation_id) {
                conversation_id = latestChat.conversation_id;
            }
            else {
                // Si el usuario no tiene ninguna conversación, retornar error y pedir que cree un check-in primero
                return res.status(400).json({ error: "No active conversation_id found for user. Please create a checkin first." });
            }
        }
        // 1️⃣ Obtener turn_id desde Supabase iterando sobre chat_messages
        const { data: lastMessage, error: turnError } = await supabase
            .from("chat_messages")
            .select("turn_id")
            .eq("conversation_id", conversation_id)
            .order("turn_id", { ascending: false })
            .limit(1)
            .maybeSingle();
        const turn_id = lastMessage?.turn_id ? lastMessage.turn_id + 1 : 1;
        if (turnError) {
            console.error("TurnId Error:", turnError);
            return res.status(500).json({ error: "Failed to generate turn_id" });
        }
        // 2️⃣ Guardar mensaje usuario
        const { data: userMessage } = await supabase
            .from("chat_messages")
            .insert({
            user_id: req.userId,
            conversation_id,
            role: "user",
            content: message,
            turn_id
        })
            .select()
            .single();
        // 3️⃣ Generar embedding
        const embedding = await (0, embedding_1.generateEmbedding)(message);
        await supabase
            .from("chat_messages")
            .update({ embedding })
            .eq("id", userMessage.id);
        // 4️⃣ Buscar contexto
        const { data: contextMessages } = await supabase.rpc("match_chat_messages", {
            query_embedding: embedding,
            match_threshold: 0.75,
            match_count: 5,
        });
        const context = contextMessages?.map((m) => m.content) || [];
        // 5️⃣ Preguntar a la IA
        const aiResponse = await (0, ai_1.askAIChat)(message, context);
        let fullMessage = aiResponse.message;
        // 6️⃣ Guardar respuesta AI
        const { data: aiMessage } = await supabase
            .from("chat_messages")
            .insert({
            user_id: req.userId,
            conversation_id,
            role: "assistant",
            content: fullMessage,
            turn_id
        })
            .select()
            .single();
        return res.json({
            message: aiResponse.message
        });
    }
    catch (error) {
        console.error("Chat error:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: error.message
        });
    }
});
exports.default = router;
