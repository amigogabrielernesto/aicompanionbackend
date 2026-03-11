"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserMetrics = void 0;
const calculateStreak_1 = require("./calculateStreak");
const updateUserMetrics = async (supabase, userId) => {
    // 1️⃣ Traer últimos checkins (ej: últimos 30)
    const { data: checkins, error } = await supabase
        .from("checkins")
        .select("mood, energy, stress, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
    if (error)
        throw error;
    if (!checkins || checkins.length === 0)
        return;
    // 2️⃣ Calcular promedios
    const avgEnergy = checkins.reduce((sum, c) => sum + (c.energy ?? 0), 0) /
        checkins.length;
    const avgStress = checkins.reduce((sum, c) => sum + (c.stress ?? 0), 0) /
        checkins.length;
    // Si mood es texto, podrías mapearlo a score
    const moodScoreMap = {
        happy: 5,
        calm: 4,
        neutral: 3,
        sad: 2,
        anxious: 1
    };
    const avgMood = checkins.reduce((sum, c) => sum + (moodScoreMap[c.mood?.toLowerCase()] ?? 3), 0) / checkins.length;
    // 3️⃣ Calcular streak
    const streak = (0, calculateStreak_1.calculateStreak)(checkins);
    // 4️⃣ Upsert métricas
    await supabase.from("user_metrics").upsert({
        user_id: userId,
        avg_mood: avgMood,
        avg_energy: avgEnergy,
        avg_stress: avgStress,
        streak_days: streak,
        updated_at: new Date()
    });
};
exports.updateUserMetrics = updateUserMetrics;
