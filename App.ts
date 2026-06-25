import expresss from "express"
import cors from "cors"
import AuthROuter from "./controllers/AuthController.js"

const app = expresss()

app.use(cors())
app.use("/api",AuthROuter)

export default app