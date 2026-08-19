import { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import { Lobby, LobbyPrivacy, Player } from "../types/types.js";
import User from "../Models/User.js";

const lobbies = new Map<string, Lobby>();
const max_players = 4;
const min_players = 1;

export function registerLobbyHandlers(socket: Socket, io: Server) {
  socket.on("lobby:create", async (playerid, callback) => {
    const roomId = randomUUID();
    const players = new Map();

    const user = await User.findById(playerid).select("-passwordHash");

    if (!user) {
      console.log("finding user failed", user);
      return;
    }

    const player: Player = {
      userId: playerid,
      username: user?.username,
      score: 0,
      lives: 3,
    };

    players.set(playerid, player);

    const password = randomUUID();

    const lobby: Lobby = {
      roomId: roomId,
      players: players,
      privacy: "PRIVATE",
      maxPlayers: max_players,
      minPlayers: min_players,
      password: password,
      inProgress: false,
    };

    lobbies.set(roomId, lobby);

    socket.join(roomId);

    callback({ status: "ok", roomId, lobby });
  });
}

export function joinLobbyHandlers(socket: Socket, io: Server) {
  socket.on("lobby:join", async (roomId, playerid, password, callback) => {
    const lobby = lobbies.get(roomId);

    if (!lobby) {
      callback({ status: "error", message: "lobby not found" });
      return;
    }

    if (lobby.players.size >= max_players) {
      callback({ status: "error", message: "lobby is full" });
      return;
    }

    if (lobby.inProgress) {
      callback({
        status: "error",
        message: "game already in progress, wait for it to finish",
      });
      return;
    }

    if (lobby.privacy === "PRIVATE" && lobby.password === undefined) {
      callback({
        status: "error",
        message: "lobby password required for this room",
      });
      return;
    }

    if (lobby.privacy === "PRIVATE" && lobby.password !== password) {
      callback({ status: "error", message: "incorrect lobby password" });
      return;
    }

    const user = await User.findById(playerid).select("-passwordHash");

    if (!user) {
      callback({ status: "error", message: "user not found" });
      return;
    }

    const player: Player = {
      userId: playerid,
      username: user.username,
      score: 0,
      lives: 3,
    };

    lobby.players.set(playerid, player);

    socket.join(roomId);

    io.to(roomId).emit("lobby:playerJoined", { player });

    callback({ status: "ok", lobby });
  });
}

export function lobbyPrivacyHandler(socket: Socket, io: Server) {
  socket.on(
    "lobby:privacyChange",
    async (roomId, playerid, privacyUpdate: LobbyPrivacy, callback) => {
      const lobby = lobbies.get(roomId);
      const player = lobby?.players.get(playerid);

      if (!lobby) {
        callback({ status: "error", message: "lobby not found" });
        return;
      }

      if (!player) {
        callback({
          status: "error",
          message: "player not found try logging out and logging in",
        });
        return;
      }

      if (privacyUpdate !== "PUBLIC" && privacyUpdate !== "PRIVATE") {
        callback({
          status: "error",
          message: "privacy cam be either PUBLIC OR PRIVATE",
        });
        return;
      }

      if (privacyUpdate === "PRIVATE") {
        lobby.password = randomUUID();
      }

      if (privacyUpdate === "PUBLIC") {
        lobby.password = undefined;
      }

      lobby.privacy = privacyUpdate;
      callback({ status: "updated", lobby });
    },
  );
}

export function lobbyDisconnectHandler(socket: Socket, io: Server) {
  socket.on("lobby:dissconnect", async (roomID, playerid, callback) => {
    const lobby = lobbies.get(roomID);

    const user = await User.findById(playerid).select("-passwordHash");

    if (!user) {
      callback({ status: "error", message: "user not found" });
      return;
    }

    if (!lobby) {
      callback({ status: "error", message: "lobby not found" });
      return;
    }

    lobby.players.delete(playerid);

    if (lobby.players.size < min_players) {
      lobbies.delete(roomID);
      callback({ status: "ok", message: "lobby discarded" });
      return;
    }

    io.to(roomID).emit("lobby:playerLeft", { username: user.username });
  });
}

export const setLobbyInProgress = (roomId: string, state: boolean) => {
  const lobby = lobbies.get(roomId);
  if (lobby) {
    lobby.inProgress = state;
  }
};

export function getPublicLobbiesHandler(socket: Socket, io: Server) {
  socket.on("lobby:getPublic", (callback) => {
    const publicLobbies = Array.from(lobbies.values())
      .filter(lobby =>
        lobby.privacy === "PUBLIC" &&
        !lobby.inProgress &&
        lobby.players.size < lobby.maxPlayers
      )
      .map(lobby => ({
        roomId: lobby.roomId,
        playerCount: lobby.players.size,
        maxPlayers: lobby.maxPlayers,
      }))

    callback({ status: "ok", lobbies: publicLobbies })
  })
}