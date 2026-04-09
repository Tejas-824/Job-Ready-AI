const interviewReportModel = require("../models/interviewReport.model")
const MockInterviewModel = require("../models/mockInterview.model")
const {
    agentGenerateNextQuestion,
    agentEvaluateAnswer,
    agentGenerateInterviewSummary,
    agentBuildResume,
    agentGenerateCoverLetter
} = require("../services/agent.service")

async function startMockInterviewController(req, res) {
    try {
        const { reportId } = req.params

        const report = await interviewReportModel.findOne({ _id: reportId, user: req.user.id })
        if (!report) return res.status(404).json({ message: "Interview report not found." })

        // Resume existing session if in_progress
        const existing = await MockInterviewModel.findOne({
            interviewReport: reportId,
            user: req.user.id,
            status: "in_progress"
        })

        if (existing) {
            return res.status(200).json({ message: "Existing session resumed.", session: existing })
        }

        const TOTAL_QUESTIONS = 7

        const firstQuestion = await agentGenerateNextQuestion({
            resume: report.resume,
            selfDescription: report.selfDescription,
            jobDescription: report.jobDescription,
            conversationHistory: [],
            questionNumber: 1,
            totalQuestions: TOTAL_QUESTIONS
        })

        const session = await MockInterviewModel.create({
            user: req.user.id,
            interviewReport: reportId,
            totalQuestions: TOTAL_QUESTIONS,
            currentQuestionNumber: 1,
            messages: [{
                role: "agent",
                content: firstQuestion.question,
                questionMeta: {
                    questionType: firstQuestion.questionType,
                    topic: firstQuestion.topic,
                    difficulty: firstQuestion.difficulty,
                    hint: firstQuestion.hint
                }
            }]
        })

        return res.status(201).json({ message: "Mock interview started.", session })
    } catch (error) {
        console.error("START MOCK INTERVIEW ERROR:", error)
        return res.status(500).json({ message: error.message || "Internal server error" })
    }
}

async function submitAnswerController(req, res) {
    try {
        const { sessionId } = req.params
        const { answer } = req.body

        if (!answer?.trim()) return res.status(400).json({ message: "Answer is required." })

        const session = await MockInterviewModel.findOne({ _id: sessionId, user: req.user.id }).populate("interviewReport")
        if (!session) return res.status(404).json({ message: "Session not found." })
        if (session.status === "completed") return res.status(400).json({ message: "Interview already completed." })

        const report = session.interviewReport

        const lastAgentMessage = [...session.messages].reverse().find(m => m.role === "agent")
        if (!lastAgentMessage) return res.status(400).json({ message: "No question found to answer." })

        // Agent evaluates answer
        const evaluation = await agentEvaluateAnswer({
            question: lastAgentMessage.content,
            answer: answer.trim(),
            jobDescription: report.jobDescription,
            questionType: lastAgentMessage.questionMeta?.questionType || "general",
            topic: lastAgentMessage.questionMeta?.topic || "General"
        })

        session.messages.push({
            role: "user",
            content: answer.trim(),
            evaluation: {
                score: evaluation.score,
                feedback: evaluation.feedback,
                strongAnswerExample: evaluation.strongAnswerExample,
                keyPointsCovered: evaluation.keyPointsCovered,
                keyPointsMissed: evaluation.keyPointsMissed
            }
        })

        const isLastQuestion = session.currentQuestionNumber >= session.totalQuestions

        if (isLastQuestion) {
            const allEvaluations = session.messages
                .filter(m => m.role === "user" && m.evaluation)
                .map((m, i) => ({
                    score: m.evaluation.score,
                    topic: session.messages[session.messages.indexOf(m) - 1]?.questionMeta?.topic || "General"
                }))

            const conversationHistory = session.messages.map(m => ({ role: m.role, content: m.content }))

            const summary = await agentGenerateInterviewSummary({
                jobDescription: report.jobDescription,
                conversationHistory,
                evaluations: allEvaluations
            })

            session.summary = summary
            session.status = "completed"
            await session.save()

            return res.status(200).json({ message: "Interview completed.", evaluation, summary, session, isCompleted: true })
        } else {
            const nextQuestionNumber = session.currentQuestionNumber + 1
            const conversationHistory = session.messages.map(m => ({ role: m.role, content: m.content }))

            const nextQuestion = await agentGenerateNextQuestion({
                resume: report.resume,
                selfDescription: report.selfDescription,
                jobDescription: report.jobDescription,
                conversationHistory,
                questionNumber: nextQuestionNumber,
                totalQuestions: session.totalQuestions
            })

            session.messages.push({
                role: "agent",
                content: nextQuestion.question,
                questionMeta: {
                    questionType: nextQuestion.questionType,
                    topic: nextQuestion.topic,
                    difficulty: nextQuestion.difficulty,
                    hint: nextQuestion.hint
                }
            })

            session.currentQuestionNumber = nextQuestionNumber
            await session.save()

            return res.status(200).json({
                message: "Answer submitted. Next question ready.",
                evaluation,
                nextQuestion: { content: nextQuestion.question, questionMeta: nextQuestion },
                session,
                isCompleted: false
            })
        }
    } catch (error) {
        console.error("SUBMIT ANSWER ERROR:", error)
        return res.status(500).json({ message: error.message || "Internal server error" })
    }
}

async function getMockInterviewSessionController(req, res) {
    try {
        const { sessionId } = req.params
        const session = await MockInterviewModel.findOne({ _id: sessionId, user: req.user.id })
        if (!session) return res.status(404).json({ message: "Session not found." })
        return res.status(200).json({ session })
    } catch (error) {
        console.error("GET SESSION ERROR:", error)
        return res.status(500).json({ message: error.message || "Internal server error" })
    }
}

async function getSessionsByReportController(req, res) {
    try {
        const { reportId } = req.params
        const sessions = await MockInterviewModel.find({ interviewReport: reportId, user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-messages")
        return res.status(200).json({ sessions })
    } catch (error) {
        console.error("GET SESSIONS ERROR:", error)
        return res.status(500).json({ message: error.message || "Internal server error" })
    }
}


async function buildResumeController(req, res) {
    try {
        const { reportId } = req.params
        const report = await interviewReportModel.findOne({ _id: reportId, user: req.user.id })
        if (!report) return res.status(404).json({ message: "Interview report not found." })

        const resumeData = await agentBuildResume({
            resume: report.resume,
            selfDescription: report.selfDescription,
            jobDescription: report.jobDescription
        })

        return res.status(200).json({ message: "Resume built successfully.", resumeData })
    } catch (error) {
        console.error("BUILD RESUME ERROR:", error)
        return res.status(500).json({ message: error.message || "Internal server error" })
    }
}

async function generateCoverLetterController(req, res) {
    try {
        const { reportId } = req.params
        const report = await interviewReportModel.findOne({ _id: reportId, user: req.user.id })
        if (!report) return res.status(404).json({ message: "Interview report not found." })

        const coverLetter = await agentGenerateCoverLetter({
            resume: report.resume,
            selfDescription: report.selfDescription,
            jobDescription: report.jobDescription
        })

        return res.status(200).json({ message: "Cover letter generated successfully.", coverLetter })
    } catch (error) {
        console.error("COVER LETTER ERROR:", error)
        return res.status(500).json({ message: error.message || "Internal server error" })
    }
}

module.exports = {
    startMockInterviewController,
    submitAnswerController,
    getMockInterviewSessionController,
    getSessionsByReportController,
    buildResumeController,
    generateCoverLetterController
}