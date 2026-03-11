export const calculateStreak = (checkins: any[]) => {
    if (!checkins.length) return 0;

    // Convertir a fechas sin hora
    const dates = checkins
        .map(c => new Date(c.created_at))
        .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;

    for (let i = 1; i < dates.length; i++) {
        const current = new Date(dates[i - 1]);
        const previous = new Date(dates[i]);

        // Normalizar a medianoche
        current.setHours(0, 0, 0, 0);
        previous.setHours(0, 0, 0, 0);

        const diffDays =
            (current.getTime() - previous.getTime()) /
            (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            streak++;
        } else if (diffDays === 0) {
            // mismo día → ignorar duplicado
            continue;
        } else {
            break;
        }
    }

    return streak;
};