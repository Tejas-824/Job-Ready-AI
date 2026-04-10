const express = require("express")
const { authUser } = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")

const interviewRouter = express.Router()


interviewRouter.post(
    "/",
    authUser,
    upload.single("resume"),
    interviewController.generateInterviewReportController
)

interviewRouter.get(
    "/report/:interviewId",
    authUser,
    interviewController.getInterviewReportByIdController
)

interviewRouter.get(
    "/",
    authUser,
    interviewController.getAllInterviewReportsController
)

module.exports = interviewRouter