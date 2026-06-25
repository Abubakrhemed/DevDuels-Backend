import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()

import app from "./App.js"

const PORT = process.env.PORT;

const MONGODB_URI = process.env.MONGODB_URI;

if (!PORT) {
    throw new Error("PORT is not defined in environment variables");
}

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
}

try {
    const response = await mongoose.connect(MONGODB_URI, { family: 4 })

    if (response) {
        app.listen(PORT, () => {
            console.log("server running on ", PORT);
        });
    }
    
} catch (err: any) {
    console.log(err)
}