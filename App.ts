import express from "express"
import cors from "cors"
import AuthROuter from "./controllers/AuthController.js"
import leaderboardRouter from "./controllers/leaderbaordController.js"
import { rateLimit } from 'express-rate-limit'

export const LoginLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	limit: 4,
	standardHeaders: true,
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

export const Accountlimiter = rateLimit({
	windowMs: 50 * 60 * 1000,
	limit: 2,
	standardHeaders: true,
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

export const resetPasswordlimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 3,
	standardHeaders: true,
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

const app = express()

app.use(cors())
app.use(express.json())
app.use("/api",AuthROuter)
app.use("/api", leaderboardRouter)
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})


export default app