import User from "../Models/User.js";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import nodemailer from "nodemailer";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { JWT_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD } from "../config/env.js";
import express from "express";

import {
  Accountlimiter,
  resetPasswordlimiter,
  LoginLimiter,
} from "../middleware/limiters.js";

const AuthRouter = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 1) return `${local}**@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 1)}@${domain}`;
}

AuthRouter.get("/user/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;
    const response = await User.findById(id).select("+email");

    if (!response) {
      res.status(404).json({ err: "no user found" });
      return;
    }

    const userObj = response.toObject();
    userObj.email = maskEmail(response.email);
    const { passwordHash: _, ...safeUser } = userObj;
    res.status(200).json({ user: safeUser });
    
  } catch (err) {
    res.status(500).json({ err: "server err occured" });
    console.log(err);
  }
});

AuthRouter.delete("/user/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id;

    if (req.userId !== id) {
      res.status(403).json({ err: "you can only delete your own account" });
      return;
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404).json({ err: "user not found" });
      return;
    }

    res.status(200).json({ message: "account deleted" });
  } catch (err) {
    res.status(500).json({ err: "server error occurred" });
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

      const resetLink = `http://localhost:5382/reset-password?token=${token}`;

      await transporter.sendMail({
        from: '"DevDuels" <abubuilds.noreply@gmail.com>',
        to: email,
        subject: "Reset your DevDuels password",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head><meta charset="UTF-8"></head>
          <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:40px;">
                    <tr>
                      <td style="text-align:center;padding-bottom:24px;">
                        <span style="font-size:24px;font-weight:bold;color:#111;">dev<span style="color:#6366f1;">duels</span></span>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:16px;color:#333;line-height:1.6;padding-bottom:16px;">
                        We received a request to reset your password. Click the button below to choose a new one.
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding:24px 0;">
                        <a href="${resetLink}" style="background-color:#6366f1;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#666;line-height:1.5;padding-bottom:8px;">
                        This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top:1px solid #e4e4e7;padding-top:16px;font-size:12px;color:#999;text-align:center;">
                        DevDuels — real-time developer duels
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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
      res
        .status(400)
        .json({ err: "reset link has expired, request a new one" });
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
