"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const metrics_1 = require("../services/metrics");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /checkin:
 *   post:
 *     summary: Create a new emotional check-in
 *     tags: [Checkins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mood:
 *                 type: string
 *               energy:
 *                 type: number
 *               stress:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check-in created successfully
 *
 * components:
 *   schemas:
 *     CheckinResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         mood:
 *           type: string
 *         energy:
 *           type: integer
 *         stress:
 *           type: integer
 *         notes:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */
const embedding_1 = require("../services/embedding");
const ai_1 = require("../services/ai");
router.post("/", auth_1.authenticate, async (req, res) => {
    let { mood, energy, stress, notes } = req.body;
    // Validate and parse energy and stress (default to 3 if invalid, bound between 1 and 10)
    energy = parseInt(energy, 10);
    energy = isNaN(energy) ? 3 : Math.max(1, Math.min(10, energy));
    stress = parseInt(stress, 10);
    stress = isNaN(stress) ? 3 : Math.max(1, Math.min(10, stress));
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    // Generate embedding for the check-in data
    let embedding = null;
    try {
        const textToEmbed = `Mood: ${mood}, Energy: ${energy}, Stress: ${stress}. Notes: ${notes}`;
        embedding = await (0, embedding_1.generateEmbedding)(textToEmbed);
    }
    catch (embeddingError) {
        console.error("Error generating embedding:", embeddingError);
    }
    const { data, error } = await supabase
        .from("checkins")
        .insert({
        user_id: req.userId,
        mood,
        energy,
        stress,
        notes,
        embedding
    })
        .select()
        .single();
    if (error)
        return res.status(400).json(error);
    // 🔥 NUEVO: Crear un mensaje en el chat simulando el check-in del usuario
    try {
        if (!data || !data.id || data.id === "undefined" || data.id === "null") {
            console.error("No valid checkin ID returned from Supabase, skipping chat_messages integration.");
            return res.json(data || { success: true });
        }
        // En vez de usar el RPC que da error PGRST202, buscamos el máximo turn_id manualmente
        const { data: lastMessage, error: turnError } = await supabase
            .from("chat_messages")
            .select("turn_id")
            .eq("conversation_id", data.id)
            .order("turn_id", { ascending: false })
            .limit(1)
            .maybeSingle();
        const turnId = lastMessage?.turn_id ? lastMessage.turn_id + 1 : 1;
        if (!turnError) {
            const { error: insertError } = await supabase
                .from("chat_messages")
                .insert({
                user_id: req.userId,
                conversation_id: data.id,
                role: "user",
                content: notes || "",
                turn_id: turnId
            });
            if (insertError) {
                console.error("Supabase insert error in chat_messages:", insertError);
            }
            // --- INICIO DE INTEGRACIÓN IA ---
            if (embedding) {
                // 1️⃣ Buscar contexto usando el embedding del check-in
                const { data: contextMessages } = await supabase.rpc("match_chat_messages", {
                    query_embedding: embedding,
                    match_threshold: 0.75,
                    match_count: 5,
                });
                const context = contextMessages?.map((m) => m.content) || [];
                // 2️⃣ Preparar el mensaje para la IA
                const aiPrompt = notes ? notes : `Acabo de registrar mi check-in. Emoción: ${mood}, Energía: ${energy}, Estrés: ${stress}`;
                // 3️⃣ Preguntar a la IA
                const aiResponse = await (0, ai_1.askAI)(aiPrompt, context);
                let fullMessage = aiResponse.message;
                if (aiResponse.tasks && aiResponse.tasks.length > 0) {
                    const tasksText = aiResponse.tasks
                        .map(t => `- ${t.title}: ${t.description}`)
                        .join("\n");
                    fullMessage += `\n\nSugerencias de actividades:\n${tasksText}`;
                }
                // 4️⃣ Guardar respuesta AI en chat_messages
                const { data: aiMessage, error: aiInsertError } = await supabase
                    .from("chat_messages")
                    .insert({
                    user_id: req.userId,
                    conversation_id: data.id,
                    role: "assistant",
                    content: fullMessage,
                    turn_id: (turnId || 1) + 1
                })
                    .select()
                    .single();
                if (aiInsertError) {
                    console.error("Supabase insert error in chat_messages for AI:", aiInsertError);
                }
                // 5️⃣ Guardar actividades sugeridas
                if (aiMessage && aiResponse.tasks && aiResponse.tasks.length > 0) {
                    const activitiesToInsert = [];
                    for (const task of aiResponse.tasks) {
                        let { data: typeData } = await supabase
                            .from("activity_types_catalog")
                            .select("id")
                            .ilike("name", task.title)
                            .maybeSingle();
                        let activityTypeId = typeData?.id;
                        if (!activityTypeId) {
                            const { data: newTypeData, error: newTypeError } = await supabase
                                .from("activity_types_catalog")
                                .insert({ name: task.title })
                                .select("id")
                                .single();
                            if (!newTypeError && newTypeData) {
                                activityTypeId = newTypeData.id;
                            }
                            else {
                                console.error("Error insertando activity type en checkin:", newTypeError);
                                continue;
                            }
                        }
                        activitiesToInsert.push({
                            user_id: req.userId,
                            chat_id: aiMessage.id,
                            description: task.description,
                            duration_minutes: null,
                            activity_type_id: activityTypeId
                        });
                    }
                    if (activitiesToInsert.length > 0) {
                        const { error: activitiesError } = await supabase
                            .from("activities")
                            .insert(activitiesToInsert);
                        if (activitiesError) {
                            console.error("Error inserting activities en checkin:", activitiesError);
                        }
                    }
                }
                // Agregar datos de IA a la respuesta (opcional, por si el frontend lo necesita enseguida)
                data.ai_response = {
                    message: aiResponse.message,
                    tasks: aiResponse.tasks
                };
            }
            // --- FIN DE INTEGRACIÓN IA ---
        }
        else {
            console.error("Error getting turn ID for check-in chat message:", turnError);
        }
    }
    catch (chatError) {
        console.error("Error creating chat message for checkin:", chatError);
    }
    // 🔥 NUEVO: actualizar métricas automáticamente
    try {
        await (0, metrics_1.updateUserMetrics)(supabase, req.userId);
    }
    catch (metricsError) {
        console.error("Error updating metrics:", metricsError);
        // No frenamos la respuesta del checkin si falla metrics
    }
    res.json(data);
});
exports.default = router;
