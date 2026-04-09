const express = require("express")
const { authUser } = require("../middlewares/auth.middleware")
const {
    startMockInterviewController,
    submitAnswerController,
    getMockInterviewSessionController,
    getSessionsByReportController,
    buildResumeController,
    generateCoverLetterController
} = require("../controllers/agent.controller")

const agentRouter = express.Router()

// Mock Interview
agentRouter.post("/mock-interview/start/:reportId", authUser, startMockInterviewController)
agentRouter.post("/mock-interview/:sessionId/answer", authUser, submitAnswerController)
agentRouter.get("/mock-interview/:sessionId", authUser, getMockInterviewSessionController)
agentRouter.get("/mock-interview/report/:reportId/sessions", authUser, getSessionsByReportController)

// Resume Builder
agentRouter.post("/resume/:reportId", authUser, buildResumeController)

// Cover Letter
agentRouter.post("/cover-letter/:reportId", authUser, generateCoverLetterController)

module.exports = agentRouter