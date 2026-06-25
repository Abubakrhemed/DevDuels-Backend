import mongoose from "mongoose";
import { Schema } from "mongoose";

const userSchema = new Schema({
     username: { type: String, required: true, unique: true },
     passwordHash: { type: String, required: true, select: false },
     Points: { type: Number, default: 0 },
     status: { type: String, enum: ["OFFLINE", "IN_LOBBY", "IN_GAME", "ONLINE"], default: "OFFLINE" },
     leaderbaordPts: { type: Number, default: 0 },
})

const User = mongoose.model('User', userSchema);

export default User