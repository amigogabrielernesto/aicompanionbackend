"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listModels = listModels;
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ai = new genai_1.GoogleGenAI({
    apiKey: process.env.AI_API_KEY,
});
async function listModels() {
    try {
        const models = await ai.models.list();
        console.log("AVAILABLE MODELS:");
        console.log(models);
    }
    catch (error) {
        console.error("Error listing models:", error);
    }
}
