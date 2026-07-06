import mongoose from "mongoose"
import { PORT,MONGODB_URI} from "./config/env.js"
import { createServer } from "node:http"
import { initSocket } from "./socket/index.js"

import app from "./App.js"

const server = createServer(app);

try {
    const response = await mongoose.connect(MONGODB_URI, { family: 4 })

    if (response) {
        initSocket(server)
        server.listen(PORT, () => {
            console.log("server running on ", PORT);
        });
    }

} catch (err: any) {
    console.log(err)
}