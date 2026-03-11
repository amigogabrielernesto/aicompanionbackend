import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "AI Wellness Companion API",
            version: "1.0.0",
            description: "Backend API for emotional wellness companion"
        },
        servers: [
            {
                url: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`,
                description: process.env.SERVER_URL ? "Production" : "Local"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },
    apis: ["./src/routes/*.ts"], // rutas donde están tus endpoints
});