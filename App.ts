import express from "express"
import cors from "cors"
import AuthROuter from "./controllers/AuthController.js"
import leaderboardRouter from "./controllers/leaderbaordController.js"

const app = express()

app.use(cors())
app.use("/api",AuthROuter)
app.use("/api", leaderboardRouter)
app.use(express.json())

export default app