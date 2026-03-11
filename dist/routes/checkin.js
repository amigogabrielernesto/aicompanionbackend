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
router.post("/", auth_1.authenticate, async (req, res) => {
    const { mood, energy, stress, notes } = req.body;
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
