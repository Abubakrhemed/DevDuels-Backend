import mongoose, { Schema } from "mongoose";

const QuestionSchema = new Schema({
    question: { type: String, required: true },
    format: { type: String, enum: ["MCQ", "CodeSnippet", "TrueFalse"], required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true, select: false },
    pointsAwarded: { type: Number, required: true },
    pointsSubtracted: { type: Number, required: true },
    timeAwarded: { type: Number, required: true },
    timeSubtracted: { type: Number, required: true },
    livesSubtracted: { type: Number, required: true }
})

const Question = mongoose.model("Question",QuestionSchema)

export default Question