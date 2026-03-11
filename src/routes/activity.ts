import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createSupabaseClient } from "../supabase";

const router = Router();

router.post("/activity-feedback", authenticate, async (req: AuthRequest, res) => {
    const { activityId, effectivenessScore } = req.body;

    const supabase = createSupabaseClient(req.accessToken!);

    const { data, error } = await supabase
        .from("activities")
        .update({
            completed: true,
            effectiveness_score: effectivenessScore
        })
        .eq("id", activityId)
        .select()
        .single();

    if (error) return res.status(400).json(error);

    res.json(data);
});

export default router;