import { Server } from "socket.io"
import { Server as HttpServer } from "node:http"

export function initSocket(server: HttpServer) {
    const io = new Server(server, {
        cors: { origin: "http://localhost:5380" }
    })

    io.on('connection', (socket) => {
        console.log('a user connected:', socket.id)

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    })

    return io
}