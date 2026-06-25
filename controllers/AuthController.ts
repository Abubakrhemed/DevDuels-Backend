import express from "express"
import User from "../Models/User.js"
import bcrypt from "bcrypt"

const AuthRouter = express.Router()

AuthRouter.get("/user:id", async (req, res) => {
    try {
        const id = req.params.id
        const response = await User.findById(id)
        if (!response) {
            res.status(400).json({ err: "no user found " })
            return
        }

        res.status(200).json({ response })
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

        const user = await User.findOne({username})

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

        res.status(200).json({ user })

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

        const passwordHash = await bcrypt.hash(password, 12)

        const user = new User({
            username,
            passwordHash,
        })

        await user.save()

        res.status(201).json({ user })

    } catch (err) {
        res.status(500).json({ err: "server err occured failed to register try again later" })
        console.log(err)
    }
})

export default AuthRouter