import Question from "../../Models/Question.js";
import { PlayerProgress, QuestionSeed } from "../../types/types.js";
import User from "../../Models/User.js";

const randomizeQuestions = (questions: Array<QuestionSeed>) => {
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j]!, questions[i]!];
  }
  return questions;
};

export const getQuestions = async () => {
  try {
    const questions = await Question.find({});
    return randomizeQuestions(questions);
  } catch (err) {
    console.log(err);
    throw new Error("server ran into an error");
  }
};

export const findUser = async (playerid: string) => {
  try {
    const user = await User.findById(playerid).select("-passwordHash");

    if (!user) {
      throw new Error("user not found");
    }

    return user;
  } catch (err) {
    console.log(err)
    throw new Error("user not found");
  }
};

export const updateLeaderboardScores = async (
    playerProgress: Map<string, PlayerProgress>
) => {
    const updates = Array.from(playerProgress.entries()).map(([userId, progress]) => {
        return User.findByIdAndUpdate(
            userId,
            { $inc: { leaderboardPts: progress.score } }
        )
    })

    await Promise.all(updates)
}
