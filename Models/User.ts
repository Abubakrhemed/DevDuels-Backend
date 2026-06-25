import mongoose from "mongoose";
import { Schema } from "mongoose";

const userSchema = new Schema ({
     username:String,
     passwordHash:String,
     Points:Number,
     status: { type: String, enum: ["OFFLINE", "IN_LOBBY", "IN_GAME", "ONLINE"], default: "OFFLINE" },
     leaderbaordPts:Number,
})

 const User = mongoose.model('User', userSchema);

 export default User