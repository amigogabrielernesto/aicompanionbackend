import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

// Cargar variables de entorno
dotenv.config();

// Importar rutas
import checkinRoutes from "./routes/checkin";
import historyRoutes from "./routes/history";
import chatRoutes from "./routes/chat";
import activityRoutes from "./routes/activity";

const app = express();

// 🔹 Middlewares globales
app.use(
    cors({
        origin: "*",
    })
);
app.use(express.json());

// 🔹 Health check (muy útil para deploy)
app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});

// 🔹 Rutas principales
app.use("/checkin", checkinRoutes);
app.use("/history", historyRoutes);
app.use("/chat", chatRoutes);
app.use("/activity", activityRoutes);
// activityRoutes tiene POST /activity-feedback

// 🔹 Manejo global de errores (simple)
app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Global error:", err);
    res.status(500).json({ error: "Internal server error" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});