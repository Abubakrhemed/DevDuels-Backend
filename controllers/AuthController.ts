import express from "express"
import User from "../Models/User.js"
import bcrypt from "bcrypt"
import jsonwebtoken from "jsonwebtoken"
import { requireAuth, AuthedRequest } from "../middleware/auth.js"
import { JWT_SECRET, } from "../config/env.js"

const AuthRouter = express.Router()

AuthRouter.get("/user/:id", requireAuth, async (req: AuthedRequest, res) => {
    try {
        const id = req.params.id
        const response = await User.findById(id)

        if (!response) {
            res.status(404).json({ err: "no user found" })
            return
        }

        const { passwordHash: _, ...safeUser } = response.toObject()
        res.status(200).json({ user: safeUser })
    } catch (err) {
        res.status(500).json({ err: "server err occured" })
        console.log(err)
    }
})

AuthRouter.post("/user/login", async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username) {
            res.status(400).json({ err: "username is required" })
            return
        }

        if (!password) {
            res.status(400).json({ err: "password is required" })
            return
        }

        if (!username || !password) {
            res.status(400).json({ err: "password & username missing" })
            return
        }

        const user = await User.findOne({ username }).select('+passwordHash')

        if (!user) {
            res.status(400).json({ err: "username or password is incorrect" })
            return
        }

        if (!user.passwordHash) {
            res.status(500).json({ err: "user account is corrupted, missing password" })
            return
        }

        const passwordCorrect = await bcrypt.compare(password, user.passwordHash)

        if (!passwordCorrect) {
            res.status(400).json({ err: "username or password is incorrect" })
            return
        }

        const token = jsonwebtoken.sign(
            { id: user._id }, JWT_SECRET,
            { expiresIn: "1d" }
        )

        const { passwordHash: _, ...safeUser } = user.toObject()
        res.status(200).json({ user: safeUser, token })

    } catch (err) {
        res.status(500).json({ err: "server err occured failed to login try again later" })
        console.log(err)
    }
})

AuthRouter.post("/user/register", async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username) {
            res.status(400).json({ err: "username is required" })
            return
        }

        if (!password) {
            res.status(400).json({ err: "password is required" })
            return
        }

        if (!username || !password) {
            res.status(400).json({ err: "password & username missing" })
            return
        }

        const exists = await User.findOne({ username })

        if (exists) {
            res.status(400).json({ err: "username is taken" })
            return
        }

        const passwordHash = await bcrypt.hash(password, 12)

        const user = new User({
            username,
            passwordHash,
        })

        await user.save()

        const { passwordHash: _, ...safeUser } = user.toObject()
        res.status(201).json({ user: safeUser })

    } catch (err) {
        res.status(500).json({ err: "server err occured failed to register try again later" })
        console.log(err)
    }
})

export default AuthRouter