import { Server, Socket } from "socket.io";
import User from "../Models/User.js";
import { getQuestions } from "./helpers/getDbQuestions.js";
import { GameState } from "../types/types.js"

const games = new Map<string, GameState>()

export default function provideQuestions(socket: Socket, io: Server) {
  socket.on("game:start", async (roomId, playerid, callback) => {
    try {
      const user = await User.findById(playerid);

      if (!user) {
        socket.emit("game:error", "couldn't find your account");
        return;
      }

      if (!games.has(roomId)) {
        const questions = await getQuestions();
        games.set(roomId, {
          roomId,
          questions,
          playerProgress: new Map(),
        });
      }

      const game = games.get(roomId)!;

      game.playerProgress.set(playerid, {
        currentIndex: 0,
        score: 0,
        lives: 3,
      });

      const progress = game.playerProgress.get(playerid)!;

      const fullQuestion = game.questions[progress.currentIndex]!;

      const { correctAnswer, ...safeQuestion } = fullQuestion;

      socket.emit("game:questionSent",safeQuestion);

    } catch (err) {
      console.log(err);
      socket.emit("game:error", "server ran into an error")
      return;
    }
  });
}
