import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
    accessToken?: string;
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded: any = jwt.decode(token);

    if (!decoded?.sub) {
        return res.status(401).json({ error: "Invalid token" });
    }

    req.userId = decoded.sub;
    req.accessToken = token;

    next();
};