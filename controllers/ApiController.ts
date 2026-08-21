import express from "express";
import { lobbies } from "../game/lobby.js";

const ApiController = express.Router();

ApiController.get("/lobbies/public", (req, res) => {
  const publicLobbies = Array.from(lobbies.values())
    .filter((lobby) => lobby.privacy === "PUBLIC")
    .map((lobby) => ({
      roomId: lobby.roomId,
      playerCount: lobby.players.size,
      maxPlayers: lobby.maxPlayers,
      inProgress: lobby.inProgress,
    }));

  res.json({ lobbies: publicLobbies });
});

export default ApiController;