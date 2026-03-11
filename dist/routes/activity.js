"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
router.post("/activity-feedback", auth_1.authenticate, async (req, res) => {
    const { activityId, effectivenessScore } = req.body;
    const supabase = (0, supabase_1.createSupabaseClient)(req.accessToken);
    const { data, error } = await supabase
        .from("activities")
        .update({
        completed: true,
        effectiveness_score: effectivenessScore
    })
        .eq("id", activityId)
        .select()
        .single();
    if (error)
        return res.status(400).json(error);
    res.json(data);
});
exports.default = router;
