const pdfParseModule = require("pdf-parse")
const { generateInterviewReport } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

const pdfParse =
    typeof pdfParseModule === "function"
        ? pdfParseModule
        : pdfParseModule.default

async function generateInterViewReportController(req, res) {
    try {
        const { selfDescription, jobDescription } = req.body
        let resumeText = ""

        if (!jobDescription || !jobDescription.trim()) {
            return res.status(400).json({
                message: "Job description is required."
            })
        }

        if (req.file) {
            if (typeof pdfParse !== "function") {
                throw new Error("PDF parser is not configured correctly.")
            }

            const parsedPdf = await pdfParse(req.file.buffer)
            resumeText = parsedPdf?.text?.trim() || ""
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...interViewReportByAi
        })

        return res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        console.log("INTERVIEW ERROR:", error)
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}

async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        return res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (error) {
        console.log("GET REPORT ERROR:", error)
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}

async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        return res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (error) {
        console.log("GET ALL REPORTS ERROR:", error)
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController
}