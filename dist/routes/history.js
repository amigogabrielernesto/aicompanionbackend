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
 *         description: A paginated list of chat messages grouped by checkin
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
 *                       created_at:
 *                         type: string
 *                       messages:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             turn_id:
 *                               type: integer
 *                             role:
 *                               type: string
 *                             content:
 *                               type: string
 *                             created_at:
 *                               type: string
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
router.get("/", auth_1.authenticate, async (req, res) => {
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    console.log(`Fetching chat history for user ${req.userId} - page: ${page}, limit: ${limit}`);
    const { data: checkinsData, count, error } = await supabase
        .from("checkins")
        .select(`
            id,
            created_at,
            chat_messages (
                id,
                turn_id,
                role,
                content,
                created_at
            )
        `, { count: "exact" })
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false })
        // Nota: para ordenar la relación hija en la misma consulta, Supabase SDK usa syntax string filters
        // pero dado que el soporte varía en el SDK, ordenamos manualmente los items hijos después
        .range(offset, offset + limit - 1);
    if (error) {
        console.error("Error fetching history:", error);
        return res.status(400).json(error);
    }
    // Remapeamos el payload para asegurar que los hijos estén ordenados y en la llave "messages" equivalente al json_agg
    const formattedMessages = checkinsData?.map((checkin) => {
        // Ordenar los mensajes por turn_id ASC como pedía la query original (ORDER BY m.turn_id ASC)
        const sortedChats = (checkin.chat_messages || []).sort((a, b) => a.turn_id - b.turn_id);
        return {
            id: checkin.id,
            created_at: checkin.created_at,
            messages: sortedChats
        };
    }) || [];
    res.json({
        messages: formattedMessages,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit)
        }
    });
});
exports.default = router;
