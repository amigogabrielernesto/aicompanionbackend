"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
// Cargar variables de entorno
dotenv_1.default.config();
// Importar rutas
const checkin_1 = __importDefault(require("./routes/checkin"));
const history_1 = __importDefault(require("./routes/history"));
const chat_1 = __importDefault(require("./routes/chat"));
const activity_1 = __importDefault(require("./routes/activity"));
const app = (0, express_1.default)();
// 🔹 Middlewares globales
app.use((0, cors_1.default)({
    origin: "*",
}));
app.use(express_1.default.json());
// 🔹 Health check (muy útil para deploy)
app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});
// 🔹 Rutas principales
app.use("/checkin", checkin_1.default);
app.use("/history", history_1.default);
app.use("/chat", chat_1.default);
app.use("/", activity_1.default);
// activityRoutes tiene POST /activity-feedback
// 🔹 Manejo global de errores (simple)
app.use((err, _req, res, _next) => {
    console.error("Global error:", err);
    res.status(500).json({ error: "Internal server error" });
});
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
