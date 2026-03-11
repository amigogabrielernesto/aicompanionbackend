import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createSupabaseClient } from "../supabase";
import { updateUserMetrics } from "../services/metrics";

const router = Router();

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


import { generateEmbedding } from "../services/embedding";

router.post("/", authenticate, async (req: AuthRequest, res) => {
    const { mood, energy, stress, notes } = req.body;

    const supabase = createSupabaseClient(req.accessToken!);

    // Generate embedding for the check-in data
    let embedding = null;
    try {
        const textToEmbed = `Mood: ${mood}, Energy: ${energy}, Stress: ${stress}. Notes: ${notes}`;
        embedding = await generateEmbedding(textToEmbed);
    } catch (embeddingError) {
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

    if (error) return res.status(400).json(error);

    // 🔥 NUEVO: actualizar métricas automáticamente
    try {
        await updateUserMetrics(supabase, req.userId!);
    } catch (metricsError) {
        console.error("Error updating metrics:", metricsError);
        // No frenamos la respuesta del checkin si falla metrics
    }

    res.json(data);
});

export default router;