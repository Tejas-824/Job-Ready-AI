const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })

const tools = [
    {
        name: "generate_interview_question",
        description: "Generates the next interview question based on candidate profile, job description, conversation history, and question number.",
        parameters: {
            type: "object",
            properties: {
                question: { type: "string" },
                questionType: { type: "string", enum: ["technical", "behavioral", "situational", "follow_up"] },
                topic: { type: "string" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                hint: { type: "string" }
            },
            required: ["question", "questionType", "topic", "difficulty"]
        }
    },
    {
        name: "evaluate_answer",
        description: "Evaluates the candidate's answer.",
        parameters: {
            type: "object",
            properties: {
                score: { type: "number", minimum: 0, maximum: 10 },
                feedback: { type: "string" },
                strongAnswerExample: { type: "string" },
                keyPointsMissed: { type: "array", items: { type: "string" } },
                keyPointsCovered: { type: "array", items: { type: "string" } }
            },
            required: ["score", "feedback", "strongAnswerExample", "keyPointsCovered", "keyPointsMissed"]
        }
    },
    {
        name: "generate_interview_summary",
        description: "Generates final summary.",
        parameters: {
            type: "object",
            properties: {
                overallScore: { type: "number", minimum: 0, maximum: 100 },
                performanceSummary: { type: "string" },
                strongAreas: { type: "array", items: { type: "string" } },
                improvementAreas: { type: "array", items: { type: "string" } },
                recommendation: { type: "string" },
                nextSteps: { type: "array", items: { type: "string" } }
            },
            required: ["overallScore", "performanceSummary", "strongAreas", "improvementAreas", "recommendation", "nextSteps"]
        }
    }
]

/* ================= QUESTION ================= */
async function agentGenerateNextQuestion(data) {
    const systemPrompt = `You are an expert interviewer...`

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: systemPrompt,
        config: { tools: [{ functionDeclarations: tools }] }
    })

    const parts = response?.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
        if (part.functionCall?.name === "generate_interview_question") {
            return part.functionCall.args
        }
    }

    return {
        question: "Tell me about a challenging technical problem you solved recently.",
        questionType: "behavioral",
        topic: "Problem Solving",
        difficulty: "medium",
        hint: "Use STAR method"
    }
}

/* ================= EVALUATION ================= */
async function agentEvaluateAnswer({ question, answer, jobDescription, questionType, topic }) {
    const systemPrompt = `Evaluate answer...`

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: systemPrompt,
        config: { tools: [{ functionDeclarations: tools }] }
    })

    const parts = response?.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
        if (part.functionCall?.name === "evaluate_answer") {
            return part.functionCall.args
        }
    }

    return {
        score: 5,
        feedback: "Basic answer",
        strongAnswerExample: "Use examples",
        keyPointsCovered: ["Basic"],
        keyPointsMissed: ["Examples"]
    }
}

/* ================= SUMMARY ================= */
async function agentGenerateInterviewSummary({ jobDescription, conversationHistory, evaluations }) {
    const avgScore = evaluations.length
        ? evaluations.reduce((s, e) => s + (e.score || 0), 0) / evaluations.length
        : 0

    const systemPrompt = `Generate summary...`

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: systemPrompt,
        config: { tools: [{ functionDeclarations: tools }] }
    })

    const parts = response?.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
        if (part.functionCall?.name === "generate_interview_summary") {
            return part.functionCall.args
        }
    }

    return {
        overallScore: Math.round(avgScore * 10),
        performanceSummary: "Completed interview",
        strongAreas: ["Communication"],
        improvementAreas: ["Technical"],
        recommendation: "Practice more",
        nextSteps: ["DSA", "Projects"]
    }
}

/* ================= RESUME ================= */
async function agentBuildResume({ resume, selfDescription, jobDescription }) {
    const prompt = `Build resume...`

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    })

    const text = typeof response?.text === "function" ? response.text() : response?.text
    if (!text) throw new Error("No resume")

    return JSON.parse(text)
}

/* ================= COVER LETTER ================= */
async function agentGenerateCoverLetter({ resume, selfDescription, jobDescription }) {
    const prompt = `Write cover letter...`

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    })

    const text = typeof response?.text === "function" ? response.text() : response?.text
    if (!text) throw new Error("No cover letter")

    return JSON.parse(text)
}

module.exports = {
    agentGenerateNextQuestion,
    agentEvaluateAnswer,
    agentGenerateInterviewSummary,
    agentBuildResume,
    agentGenerateCoverLetter
}