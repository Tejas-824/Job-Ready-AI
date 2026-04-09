const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["agent", "user"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    questionMeta: {
        questionType: String,
        topic: String,
        difficulty: String,
        hint: String
    },
    evaluation: {
        score: Number,
        feedback: String,
        strongAnswerExample: String,
        keyPointsCovered: [String],
        keyPointsMissed: [String]
    }
}, { _id: true, timestamps: true })

const mockInterviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    interviewReport: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewReport",
        required: true
    },
    status: {
        type: String,
        enum: ["in_progress", "completed"],
        default: "in_progress"
    },
    totalQuestions: {
        type: Number,
        default: 7
    },
    currentQuestionNumber: {
        type: Number,
        default: 0
    },
    messages: [messageSchema],
    summary: {
        overallScore: Number,
        performanceSummary: String,
        strongAreas: [String],
        improvementAreas: [String],
        recommendation: String,
        nextSteps: [String]
    }
}, { timestamps: true })

const MockInterviewModel = mongoose.model("MockInterview", mockInterviewSchema)
module.exports = MockInterviewModel