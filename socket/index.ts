import { Server, Socket } from "socket.io"
import { Server as HttpServer } from "node:http"
import { joinLobbyHandlers, lobbyDisconnectHandler, registerLobbyHandlers } from "../game/lobby.js"

export function initSocket(server: HttpServer) {
    const io = new Server(server, {
        cors: { origin: "http://localhost:5380" }
    })

    io.on('connection', (socket) => {
        
        registerLobbyHandlers(socket,io)
        joinLobbyHandlers(socket,io)
        lobbyDisconnectHandler(socket,io)

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    })

    return io
}