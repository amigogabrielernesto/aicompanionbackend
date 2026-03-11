import { SupabaseClient } from "@supabase/supabase-js";
import { calculateStreak } from "./calculateStreak";

export const updateUserMetrics = async (
    supabase: SupabaseClient,
    userId: string
) => {
    // 1️⃣ Traer últimos checkins (ej: últimos 30)
    const { data: checkins, error } = await supabase
        .from("checkins")
        .select("mood, energy, stress, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

    if (error) throw error;
    if (!checkins || checkins.length === 0) return;

    // 2️⃣ Calcular promedios
    const avgEnergy =
        checkins.reduce((sum, c) => sum + (c.energy ?? 0), 0) /
        checkins.length;

    const avgStress =
        checkins.reduce((sum, c) => sum + (c.stress ?? 0), 0) /
        checkins.length;

    // Si mood es texto, podrías mapearlo a score
    const moodScoreMap: Record<string, number> = {
        happy: 5,
        calm: 4,
        neutral: 3,
        sad: 2,
        anxious: 1
    };

    const avgMood =
        checkins.reduce(
            (sum, c) => sum + (moodScoreMap[c.mood?.toLowerCase()] ?? 3),
            0
        ) / checkins.length;

    // 3️⃣ Calcular streak
    const streak = calculateStreak(checkins);

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