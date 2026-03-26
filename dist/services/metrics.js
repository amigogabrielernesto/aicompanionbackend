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
        // Antiguos (Inglés)
        happy: 5,
        calm: 4,
        neutral: 3,
        sad: 2,
        anxious: 1,
        // Nuevos (Español) - Positivos
        alegre: 5,
        feliz: 5,
        tranquilo: 5,
        sereno: 5,
        satisfecho: 5,
        contento: 5,
        optimista: 5,
        esperanzado: 5,
        inspirado: 5,
        agradecido: 5,
        'en paz': 5,
        entusiasmado: 5,
        confiado: 5,
        // Nuevos (Español) - Neutros
        indiferente: 3,
        pensativo: 3,
        reflexivo: 3,
        nostálgico: 3,
        expectante: 3,
        curioso: 3,
        sorprendido: 3,
        distraído: 3,
        // Nuevos (Español) - Negativos
        triste: 1,
        melancólico: 1,
        desanimado: 1,
        frustrado: 1,
        decepcionado: 1,
        irritado: 1,
        enojado: 1,
        ansioso: 1,
        inseguro: 1,
        preocupado: 1,
        confundido: 1,
        solo: 1
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
