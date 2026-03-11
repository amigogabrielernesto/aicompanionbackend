import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createSupabaseClient } from "../supabase";

const router = Router();

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

router.get("/", authenticate, async (req: AuthRequest, res) => {
    const supabase = createSupabaseClient(req.accessToken!);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
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

export default router;