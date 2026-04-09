import axios from "axios"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
})

export const startMockInterview = async (reportId) => {
    const response = await api.post(`/api/agent/mock-interview/start/${reportId}`)
    return response.data
}

export const submitAnswer = async (sessionId, answer) => {
    const response = await api.post(`/api/agent/mock-interview/${sessionId}/answer`, { answer })
    return response.data
}

export const getMockInterviewSession = async (sessionId) => {
    const response = await api.get(`/api/agent/mock-interview/${sessionId}`)
    return response.data
}

export const buildResume = async (reportId) => {
    const response = await api.post(`/api/agent/resume/${reportId}`)
    return response.data
}

export const generateCoverLetter = async (reportId) => {
    const response = await api.post(`/api/agent/cover-letter/${reportId}`)
    return response.data
}

export default api