import { Server, Socket } from "socket.io";
import User from "../Models/User.js";
import { getQuestions, findUser } from "./helpers/helpers.js";
import { GameState, QuestionSeed } from "../types/types.js";

const games = new Map<string, GameState>();

export default function provideQuestions(socket: Socket, io: Server) {
  socket.on("game:start", async (roomId, playerid, callback) => {
    try {
      const user = await findUser(playerid);

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

      socket.emit("game:questionSent", safeQuestion);
    } catch (err) {
      console.log(err);
      socket.emit("game:error", "server ran into an error");
    }
  });
}

export function confirmAnswer(socket: Socket, io: Server) {
  socket.on(
    "game:answerSubmited",
    async (answer, playerid, roomId, callback) => {
      try {
        const user = await findUser(playerid);

        if (!user) {
          callback({
            status: "error",
            message: "could not find account, logout and try again",
          });
          return;
        }

        const game = games.get(roomId);

        if (!game) {
          callback({ status: "error", message: "game room not found" });
          return;
        }

        const currentState = game.playerProgress.get(playerid);

        if (!currentState) {
          socket.emit("game:error", "game state not found");
          socket.leave(game.roomId);
          return;
        }

        if (currentState.lives <= 0) {
          callback({ status: "error", message: "you have no lives remaining" });
          return;
        }

        const currentQuestion = game.questions[currentState.currentIndex]!;

        const answerCheck = checkAnswer(answer, roomId, playerid);
        const pointsChange = calculatePoints(answerCheck, currentQuestion);
        const livesChange = calculateLives(answerCheck, currentQuestion);

        currentState.score += pointsChange;
        currentState.lives += livesChange;
        currentState.currentIndex += 1;

        if (currentState.lives <= 0) {
          socket.emit("game:over", {
            score: currentState.score,
            reason: "no lives remaining",
          });
          return;
        }

        const nextQuestion = game.questions[currentState.currentIndex];

        if (!nextQuestion) {
          socket.emit("game:over", {
            score: currentState.score,
            reason: "all questions answered",
          });
          return;
        }

        const { correctAnswer, ...safeQ } = nextQuestion;

        socket.emit("game:questionSent", safeQ, {
          score: currentState.score,
          lives: currentState.lives,
          currentIndex: currentState.currentIndex,
        });
      } catch (err) {
        console.log(err);
        socket.emit("game:error", "server ran into an error");
      }
    },
  );
}

const checkAnswer = (answer: string, roomId: string, playerid: string) => {
  const game = games.get(roomId)!;
  const progress = game.playerProgress.get(playerid)!;
  const currentQuestion = game.questions[progress.currentIndex]!;

  return {
    answeredCorrect: answer === currentQuestion.correctAnswer,
    format: currentQuestion.format,
  };
};

const calculatePoints = (
  object: { answeredCorrect: boolean },
  currentQuestion: QuestionSeed,
): number => {
  if (object.answeredCorrect) {
    return currentQuestion.pointsAwarded;
  }
  return -currentQuestion.pointsSubtracted;
};

const calculateLives = (
  object: { answeredCorrect: boolean },
  currentQuestion: QuestionSeed,
): number => {
  if (object.answeredCorrect) {
    return 0;
  }
  return -currentQuestion.livesSubtracted;
};
