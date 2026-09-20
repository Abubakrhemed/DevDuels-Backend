import { Server } from "socket.io";
import { Server as HttpServer } from "node:http";
import {
  joinLobbyHandlers,
  lobbyDisconnectHandler,
  registerLobbyHandlers,
  lobbyPrivacyHandler,
  getCurrentLobbyHandler,
  getPublicLobbiesHandler,
} from "../game/lobby.js";

import { confirmAnswer, startGame,beginGame } from "../game/game.js";

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: "http://localhost:5380" },
  });

  io.on("connection", (socket) => {
    registerLobbyHandlers(socket, io);
    joinLobbyHandlers(socket, io);
    lobbyDisconnectHandler(socket, io);
    startGame(socket, io);
    confirmAnswer(socket, io);
    lobbyPrivacyHandler(socket, io);
    getCurrentLobbyHandler(socket, io);
    getPublicLobbiesHandler(socket,io)

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  return io;
}
