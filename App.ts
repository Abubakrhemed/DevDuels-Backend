import express from "express"
import cors from "cors"
import AuthROuter from "./controllers/AuthController.js"
import leaderboardRouter from "./controllers/leaderbaordController.js"

const app = express()

app.use(cors())
app.use(express.json())
app.use("/api",AuthROuter)
app.use("/api", leaderboardRouter)


export default app