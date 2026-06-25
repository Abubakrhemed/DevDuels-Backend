import mongoose from "mongoose"
import dotenv from "dotenv"
import { PORT,MONGODB_URI} from "./config/env.js"

dotenv.config()

import app from "./App.js"

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