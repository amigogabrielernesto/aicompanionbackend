import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createSupabaseClient } from "../supabase";

const router = Router();

/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get chat message history
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: A paginated list of chat messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       room_id:
 *                         type: string
 *                       role:
 *                         type: string
 *                       content:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */

router.get("/", authenticate, async (req: AuthRequest, res) => {
    const supabase = createSupabaseClient(req.accessToken!);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    console.log(`Fetching chat history for user ${req.userId} - page: ${page}, limit: ${limit}`);

    const { data: messages, count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact" })
        .eq("user_id", req.userId)
        .order("turn_id", { ascending: false })
        .order("role", { ascending: false })
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