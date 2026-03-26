import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createSupabaseClient } from "../supabase";

const router = Router();

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get the current user's profile information
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 fullname:
 *                   type: string
 *                 country:
 *                   type: string
 *                 email:
 *                   type: string
 */
router.get("/profile", authenticate, async (req: AuthRequest, res) => {
    const supabase = createSupabaseClient(req.accessToken!);
    
    // 1. Obtener datos de la tabla profiles
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", req.userId)
        .single();

    if (profileError) {
        console.error("Error fetching profile from DB:", profileError);
        return res.status(400).json(profileError);
    }

    // 2. Obtener el email del usuario desde Auth para centralizar la info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
        console.error("Error fetching user from auth:", authError);
    }

    res.json({
        ...profile,
        email: user?.email
    });
});

export default router;
