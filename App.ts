import express from "express"
import cors from "cors"
import AuthROuter from "./controllers/AuthController.js"
import leaderboardRouter from "./controllers/leaderbaordController.js"
import { CLIENT_ORIGIN } from "./config/env.js"

const app = express()

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())
app.use("/api",AuthROuter)
app.use("/api", leaderboardRouter)
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})


export default app