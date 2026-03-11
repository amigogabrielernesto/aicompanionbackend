"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get user check-in history
 *     tags: [Checkins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of check-ins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CheckinResponse'
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth_1.authenticate, async (req, res) => {
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { data: messages, count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);
    if (error) {
        return res.status(400).json(error);
    }
    res.json({
        messages,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit)
        }
    });
});
exports.default = router;
