import User from "../Models/User.js";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import nodemailer from "nodemailer";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { JWT_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD } from "../config/env.js";
import express from "express";

import { Accountlimiter, resetPasswordlimiter, LoginLimiter } from "../App.js";

const AuthRouter = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

AuthRouter.get("/user/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    const response = await User.findById(id);

    if (!response) {
      res.status(404).json({ err: "no user found" });
      return;
    }

    const { passwordHash: _, ...safeUser } = response.toObject();
    res.status(200).json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ err: "server err occured" });
    console.log(err);
  }
});

AuthRouter.post("/user/login", LoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      res.status(400).json({ err: "username is required" });
      return;
    }

    if (!password) {
      res.status(400).json({ err: "password is required" });
      return;
    }

    if (!username || !password) {
      res.status(400).json({ err: "password & username missing" });
      return;
    }

    const user = await User.findOne({ username }).select("+passwordHash");

    if (!user) {
      res.status(400).json({ err: "username or password is incorrect" });
      return;
    }

    if (!user.passwordHash) {
      res
        .status(500)
        .json({ err: "user account is corrupted, missing password" });
      return;
    }

    const passwordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!passwordCorrect) {
      res.status(400).json({ err: "username or password is incorrect" });
      return;
    }

    const token = jsonwebtoken.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "1d",
    });

    const { passwordHash: _, ...safeUser } = user.toObject();
    res.status(200).json({ user: safeUser, token });
  } catch (err) {
    res
      .status(500)
      .json({ err: "server err occured failed to login try again later" });
    console.log(err);
  }
});

AuthRouter.post("/user/register", Accountlimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username) {
      res.status(400).json({ err: "username is required" });
      return;
    }

    if (!password) {
      res.status(400).json({ err: "password is required" });
      return;
    }

    if (!email) {
      res.status(400).json({ err: "email is required" });
      return;
    }

    if (!username || !password || !email) {
      res.status(400).json({ err: "password & username missing" });
      return;
    }

    const exists = await User.findOne({ username });

    if (exists) {
      res.status(400).json({ err: "username is taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = new User({
      username,
      passwordHash,
      email,
    });

    await user.save();

    res.status(201).json({
      user: { _id: user._id, username: user.username },
    });
  } catch (err) {
    res
      .status(500)
      .json({ err: "server err occured failed to register try again later" });
    console.log(err);
  }
});

AuthRouter.post(
  "/user/passwordReset",
  resetPasswordlimiter,
  async (req, res) => {
    try {
      const { username, email } = req.body;

      if (!username) {
        res.status(400).json({ err: "username is required" });
        return;
      }

      if (!email) {
        res.status(400).json({ err: "email is required" });
        return;
      }

      if (!username || !email) {
        res.status(400).json({ err: "email & username missing" });
        return;
      }

      const user = await User.findOne({ username }).select("email");

      if (!user) {
        res.status(200).json({
          message:
            "if email is registered to user you will receive code to reset password",
        });
        return;
      }

      if (user.email !== email) {
        res.status(200).json({
          message:
            "if email is registered to user you will receive code to reset password",
        });
        return;
      }

      const token = jsonwebtoken.sign(
        { id: user._id, purpose: "password-reset" },
        JWT_SECRET,
        { expiresIn: "15m" },
      );

      const resetLink = `http://localhost:5172/reset-password?token=${token}`;

      await transporter.sendMail({
        from: GMAIL_USER,
        to: email,
        subject: "DevDuels Password Reset Request",
        html: `
          <h1>Password Reset</h1>
          <p>If you did not request a password reset you can ignore this email.</p>
          <p>This link expires in 15 minutes.</p>
          <a href="${resetLink}">Reset your password</a>
        `,
      });

      res.status(200).json({
        message:
          "if email is registered to user you will receive code to reset password",
      });
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ err: "server couldn't reset password try again later" });
    }
  },
);

AuthRouter.put("/user/passwordReset", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      res.status(400).json({ err: "reset token is required" });
      return;
    }

    if (!password) {
      res.status(400).json({ err: "new password is required" });
      return;
    }

    const decoded = jsonwebtoken.verify(token, JWT_SECRET);

    if (
      typeof decoded === "string" ||
      !("purpose" in decoded) ||
      decoded.purpose !== "password-reset"
    ) {
      res.status(400).json({ err: "invalid reset token" });
      return;
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(400).json({ err: "user not found" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    user.passwordHash = passwordHash;
    await user.save();

    res.status(200).json({ message: "password updated successfully" });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(400).json({ err: "reset link has expired, request a new one" });
      return;
    }

    if (err.name === "JsonWebTokenError") {
      res.status(400).json({ err: "invalid reset token" });
      return;
    }

    console.log(err);
    res
      .status(500)
      .json({ err: "server couldn't reset password try again later" });
  }
});

export default AuthRouter;