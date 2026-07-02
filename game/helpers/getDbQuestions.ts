import Question from "../../Models/Question.js";
import { QuestionSeed } from "../../types/types.js";

const randomizeQuestions = (questions:Array<QuestionSeed>) => {
        for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
       [questions[i], questions[j]] = [questions[j]!, questions[i]!];
    }
    return questions;
}

export const getQuestions = async () => {
  try {
    const questions = await Question.find({});
    return randomizeQuestions(questions);
  } catch (err) {
    console.log(err);
    throw new Error("server ran into an error");
  }
};
