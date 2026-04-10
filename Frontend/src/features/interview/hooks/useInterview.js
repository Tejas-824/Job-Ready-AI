import { getAllInterviewReports, generateInterviewReport, getInterviewReportById } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"

export const useInterview = () => {
    const context = useContext(InterviewContext)

    // useParams is safe to call here but interviewId may be undefined on Home page
    let params = {}
    try {
        params = useParams()
    } catch {
        params = {}
    }
    const interviewId = params?.interviewId

    if (!context) throw new Error("useInterview must be used within an InterviewProvider")

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response?.interviewReport || null)
        } catch (error) {
            console.log("Generate Report Error:", error.response?.data || error.message)
        } finally {
            setLoading(false)
        }
        return response?.interviewReport || null
    }

    const getReportById = async (id) => {
        setLoading(true)
        let response = null
        try {
            response = await getInterviewReportById(id)
            setReport(response?.interviewReport || null)
        } catch (error) {
            console.log("Get Report By Id Error:", error.response?.data || error.message)
        } finally {
            setLoading(false)
        }
        return response?.interviewReport || null
    }

    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response?.interviewReports || [])
        } catch (error) {
            console.log("Get Reports Error:", error.response?.data || error.message)
        } finally {
            setLoading(false)
        }
        return response?.interviewReports || []
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [interviewId])

    return { loading, report, reports, generateReport, getReportById, getReports }
}