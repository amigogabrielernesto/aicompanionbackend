"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jsonwebtoken_1.default.decode(token);
    if (!decoded?.sub) {
        return res.status(401).json({ error: "Invalid token" });
    }
    req.userId = decoded.sub;
    req.accessToken = token;
    next();
};
exports.authenticate = authenticate;
