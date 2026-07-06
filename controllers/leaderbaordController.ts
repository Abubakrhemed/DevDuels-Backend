import express from "express"
import User from "../Models/User.js"

const leaderboardRouter = express.Router()

leaderboardRouter.get("/leaderboard", async (req, res) => {
    try {
        const leaders = await User
            .find({})
            .sort({ leaderboardPts: -1 })
            .limit(100)
            .select("username leaderboardPts")

        res.status(200).json({ leaders })
    } catch (err) {
        res.status(500).json({ err: "failed to fetch leaderboard" })
    }
})

export default leaderboardRouter