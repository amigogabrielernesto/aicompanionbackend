"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /activity:
 *   get:
 *     summary: List all user activities
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of activities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/", auth_1.authenticate, async (req, res) => {
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    const { data, error } = await supabase
        .from("activities")
        .select(`
            *,
            activity_types_catalog (
                name
            )
        `)
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false });
    if (error)
        return res.status(400).json(error);
    res.json(data);
});
/**
 * @swagger
 * /activity/{id}:
 *   patch:
 *     summary: Update activity status or effectiveness
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, canceled]
 *               effectivenessScore:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Activity updated successfully
 */
router.patch("/:id", auth_1.authenticate, async (req, res) => {
    const { id } = req.params;
    const { status, effectivenessScore } = req.body;
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    const updateData = {};
    if (status) {
        updateData.status = status;
        updateData.status = status;
    }
    if (effectivenessScore !== undefined) {
        const score = parseInt(effectivenessScore, 10);
        updateData.effectiveness_score = isNaN(score) ? 5 : Math.max(1, Math.min(10, score));
    }
    const { data, error } = await supabase
        .from("activities")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", req.userId) // Security check
        .select()
        .single();
    if (error)
        return res.status(400).json(error);
    res.json(data);
});
// Mantener compatibilidad con el endpoint anterior por si acaso
router.post("/activity-feedback", auth_1.authenticate, async (req, res) => {
    const { activityId, effectivenessScore } = req.body;
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    const score = parseInt(effectivenessScore, 10);
    const validScore = isNaN(score) ? 5 : Math.max(1, Math.min(10, score));
    const { data, error } = await supabase
        .from("activities")
        .update({
        status: "completed",
        effectiveness_score: validScore
    })
        .eq("id", activityId)
        .eq("user_id", req.userId)
        .select()
        .single();
    if (error)
        return res.status(400).json(error);
    res.json(data);
});
exports.default = router;
