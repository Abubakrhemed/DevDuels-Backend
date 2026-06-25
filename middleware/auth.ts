import jsonwebtoken from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"
import { JWT_SECRET } from "../config/env.js"

export interface AuthedRequest extends Request {
    userId?: string
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ err: "no token provided" })
        return
    }

    const token = authHeader.split(" ")[1]
    
    if (!token) {
        res.status(401).json({ err: "no token provided" })
        return
    }

    try {
        const decoded = jsonwebtoken.verify(token, JWT_SECRET)

        if (typeof decoded === "string" || !("id" in decoded)) {
            res.status(401).json({ err: "invalid token payload" })
            return
        }

        req.userId = decoded.id as string
        next()
    } catch (err) {
        res.status(401).json({ err: "invalid or expired token" })
    }
}