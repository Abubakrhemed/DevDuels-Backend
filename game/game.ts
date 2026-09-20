import { Server, Socket } from "socket.io";
import {
  getQuestions,
  findUser,
  updateLeaderboardScores,
} from "./helpers/helpers.js";
import { GameState, PlayerProgress, QuestionSeed } from "../types/types.js";
import { setLobbyInProgress } from "./lobby.js";

const games = new Map<string, GameState>();

export function beginGame(socket: Socket, io: Server) {
  socket.on("game:begin", (roomId, callback) => {
    setLobbyInProgress(roomId, true);
    io.to(roomId).emit("game:started");
    callback({ status: "ok" });
  });
}

export function startGame(socket: Socket, io: Server) {
  socket.on("game:start", async (roomId, playerid) => {
    try {
      const user = await findUser(playerid);

      if (!user) {
        socket.emit("game:error", "couldn't find your account");
        return;
      }

      let game = games.get(roomId);

      if (!game) {
        const questions = await getQuestions();
        game = {
          roomId,
          questions,
          playerProgress: new Map(),
        };
        games.set(roomId, game);
        setLobbyInProgress(roomId, true);
      }

      const activeGame = game;

      if (activeGame.playerProgress.has(playerid)) {
        const existing = activeGame.playerProgress.get(playerid)!;
        const current = activeGame.questions[existing.currentIndex];
        if (current) {
          const { correctAnswer, ...safeQuestion } = current;
          socket.emit("game:questionSent", safeQuestion, {
            score: existing.score,
            lives: existing.lives,
            currentIndex: existing.currentIndex,
            time: existing.time,
          });
        }
        return;
      }

      activeGame.playerProgress.set(playerid, {
        currentIndex: 0,
        score: 0,
        lives: 3,
        time: 30000,
        timeoutId: null,
      });

      const progress = activeGame.playerProgress.get(playerid)!;

      const timeoutId = setTimeout(() => {
        socket.emit("game:over", {
          score: progress.score,
          reason: "no time remaining",
        });

        progress.time = 0;

        if (checkAllPlayersFinished(activeGame)) {
          handleGameEnd(io, roomId, activeGame);
        }
      }, 30000);

      progress.timeoutId = timeoutId;

      const fullQuestion = activeGame.questions[progress.currentIndex]!;
      const { correctAnswer, ...safeQuestion } = fullQuestion;

      socket.emit("game:questionSent", safeQuestion);
    } catch (err) {
      console.log(err);
      socket.emit("game:error", "server ran into an error");
    }
  });
}

const clearPlayerTimeout = (state: PlayerProgress) => {
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }
};

const checkAllPlayersFinished = (game: GameState): boolean => {
  for (const [, progress] of game.playerProgress) {
    const outOfLives = progress.lives <= 0;
    const outOfTime = progress.time <= 0;
    const outOfQuestions = progress.currentIndex >= game.questions.length;

    if (!outOfLives && !outOfTime && !outOfQuestions) {
      return false;
    }
  }
  return true;
};

const handleGameEnd = async (io: Server, roomId: string, game: GameState) => {
  const result = checkWinner(game.playerProgress);
  io.to(roomId).emit("game:end", result);

  try {
    await updateLeaderboardScores(game.playerProgress);
  } catch (err) {
    console.error("failed to update leaderboard scores:", err);
  }

  setTimeout(() => {
    io.to(roomId).emit("game:returnToLobby");
    setLobbyInProgress(roomId, false);
    games.delete(roomId);
  }, 10000);
};

const checkWinner = (playerProgress: Map<string, PlayerProgress>) => {
  const entries = Array.from(playerProgress.entries());

  if (entries.length === 0) return null;

  let maxScore = -Infinity;
  for (const [, progress] of entries) {
    if (progress.score > maxScore) {
      maxScore = progress.score;
    }
  }

  const winners = entries
    .filter(([, progress]) => progress.score === maxScore)
    .map(([userId, progress]) => ({ userId, score: progress.score }));

  if (winners.length === 1) {
    return { tie: false, winner: winners[0] };
  }

  return { tie: true, winners };
};

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
        const timeChange = calculateTime(answerCheck, currentQuestion);

        currentState.score += pointsChange;
        currentState.lives += livesChange;
        currentState.currentIndex += 1;
        currentState.time += timeChange;

        if (currentState.lives <= 0) {
          clearPlayerTimeout(currentState);
          socket.emit("game:over", {
            score: currentState.score,
            reason: "no lives remaining",
          });

          if (checkAllPlayersFinished(game)) {
            handleGameEnd(io, roomId, game);
          }
          return;
        }

        if (currentState.time <= 0) {
          clearPlayerTimeout(currentState);
          socket.emit("game:over", {
            score: currentState.score,
            reason: "no time remaining",
          });

          if (checkAllPlayersFinished(game)) {
            handleGameEnd(io, roomId, game);
          }
          return;
        }

        const nextQuestion = game.questions[currentState.currentIndex];

        if (!nextQuestion) {
          clearPlayerTimeout(currentState);
          socket.emit("game:over", {
            score: currentState.score,
            reason: "all questions answered",
          });

          if (checkAllPlayersFinished(game)) {
            handleGameEnd(io, roomId, game);
          }
          return;
        }

        const { correctAnswer, ...safeQ } = nextQuestion;

        socket.emit("game:questionSent", safeQ, {
          score: currentState.score,
          lives: currentState.lives,
          currentIndex: currentState.currentIndex,
          time: currentState.time,
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

const calculateTime = (
  object: { answeredCorrect: boolean },
  currentQuestion: QuestionSeed,
): number => {
  if (object.answeredCorrect) {
    return currentQuestion.timeAwarded;
  }
  return -currentQuestion.timeSubtracted;
};