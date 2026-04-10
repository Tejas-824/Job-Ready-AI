const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })

const generateQuestionTool = {
    name: "generate_interview_question",
    description: "Generates the next interview question based on candidate profile and job description.",
    parameters: {
        type: "object",
        properties: {
            question: { type: "string" },
            questionType: { type: "string", enum: ["technical", "behavioral", "situational", "follow_up"] },
            topic: { type: "string" },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            hint: { type: "string" }
        },
        required: ["question", "questionType", "topic", "difficulty", "hint"]
    }
}

const evaluateAnswerTool = {
    name: "evaluate_answer",
    description: "Evaluates the candidate's answer and returns score, feedback, and a strong answer example.",
    parameters: {
        type: "object",
        properties: {
            score: { type: "number" },
            feedback: { type: "string" },
            strongAnswerExample: { type: "string" },
            keyPointsMissed: { type: "array", items: { type: "string" } },
            keyPointsCovered: { type: "array", items: { type: "string" } }
        },
        required: ["score", "feedback", "strongAnswerExample", "keyPointsCovered", "keyPointsMissed"]
    }
}

const generateSummaryTool = {
    name: "generate_interview_summary",
    description: "Generates final summary of the mock interview with overall score and recommendations.",
    parameters: {
        type: "object",
        properties: {
            overallScore: { type: "number" },
            performanceSummary: { type: "string" },
            strongAreas: { type: "array", items: { type: "string" } },
            improvementAreas: { type: "array", items: { type: "string" } },
            recommendation: { type: "string" },
            nextSteps: { type: "array", items: { type: "string" } }
        },
        required: ["overallScore", "performanceSummary", "strongAreas", "improvementAreas", "recommendation", "nextSteps"]
    }
}

async function callWithTool(prompt, tool) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
            config: {
                tools: [{ functionDeclarations: [tool] }],
                toolConfig: {
                    functionCallingConfig: {
                        mode: "ANY",
                        allowedFunctionNames: [tool.name]
                    }
                }
            }
        })

        const candidates = response?.candidates || []
        for (const candidate of candidates) {
            const parts = candidate?.content?.parts || []
            for (const part of parts) {
                if (part.functionCall?.name === tool.name) {
                    return part.functionCall.args
                }
            }
        }

        if (response?.functionCalls?.length > 0) {
            const fc = response.functionCalls.find(f => f.name === tool.name)
            if (fc) return fc.args
        }

        return null
    } catch (error) {
        console.error(`Tool call error for ${tool.name}:`, error.message)
        return null
    }
}

async function agentGenerateNextQuestion({ resume, selfDescription, jobDescription, conversationHistory, questionNumber, totalQuestions }) {
    console.log(`agentGenerateNextQuestion called — Q${questionNumber}/${totalQuestions}`)

    const prompt = `You are an expert technical interviewer.

Job Description:
${jobDescription}

Candidate:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}

You are on question ${questionNumber} of ${totalQuestions}.
Previous conversation: ${JSON.stringify(conversationHistory)}

Rules:
- Questions 1-3: Technical, increasing difficulty
- Questions 4-5: Situational/problem-solving
- Questions 6-7: Behavioral (STAR method)
- If last answer was vague, use follow_up type
- Always give a helpful hint

Call generate_interview_question now.`

    const result = await callWithTool(prompt, generateQuestionTool)
    if (result) return result

    return {
        question: "Tell me about a challenging technical problem you solved recently.",
        questionType: "behavioral",
        topic: "Problem Solving",
        difficulty: "medium",
        hint: "Use the STAR method: Situation, Task, Action, Result."
    }
}

async function agentEvaluateAnswer({ question, answer, jobDescription, questionType, topic }) {
    console.log("agentEvaluateAnswer called — topic:", topic)

    const prompt = `You are an expert interviewer evaluating a candidate's answer.

Job: ${jobDescription}
Question: ${question}
Type: ${questionType}
Topic: ${topic}
Answer: ${answer}

Score 0-3 poor, 4-6 average, 7-8 good, 9-10 excellent.
Call evaluate_answer now.`

    const result = await callWithTool(prompt, evaluateAnswerTool)
    if (result) return result

    return {
        score: 5,
        feedback: "Your answer showed basic understanding. Include specific examples.",
        strongAnswerExample: "A stronger answer would include specific examples with measurable outcomes.",
        keyPointsCovered: ["Basic understanding"],
        keyPointsMissed: ["Specific examples", "Quantifiable results"]
    }
}

async function agentGenerateInterviewSummary({ jobDescription, conversationHistory, evaluations }) {
    console.log("agentGenerateInterviewSummary called")

    const avgScore = evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / evaluations.length
        : 0

    const prompt = `Generate a final mock interview summary.

Job: ${jobDescription}
Transcript: ${JSON.stringify(conversationHistory)}
Scores: ${JSON.stringify(evaluations.map((e, i) => ({ q: i + 1, score: e.score, topic: e.topic })))}
Average: ${avgScore.toFixed(1)}/10

Call generate_interview_summary now.`

    const result = await callWithTool(prompt, generateSummaryTool)
    if (result) return result

    return {
        overallScore: Math.round(avgScore * 10),
        performanceSummary: "You completed the mock interview session.",
        strongAreas: ["Communication"],
        improvementAreas: ["Technical depth"],
        recommendation: "Continue practicing with more mock interviews.",
        nextSteps: ["Review skill gaps", "Practice coding problems", "Study system design"]
    }
}

const resumeSchema = z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    location: z.string().optional(),
    summary: z.string(),
    skills: z.array(z.string()),
    experience: z.array(z.object({
        title: z.string(),
        company: z.string(),
        duration: z.string(),
        achievements: z.array(z.string())
    })),
    education: z.array(z.object({
        degree: z.string(),
        institution: z.string(),
        year: z.string()
    })),
    projects: z.array(z.object({
        name: z.string(),
        description: z.string(),
        technologies: z.array(z.string()),
        impact: z.string()
    })),
    certifications: z.array(z.string()).optional(),
    atsScore: z.number(),
    atsTips: z.array(z.string()),
    tailoredFor: z.string()
})

async function agentBuildResume({ resume, selfDescription, jobDescription }) {
    console.log("agentBuildResume called")

    const prompt = `You are an expert resume writer and ATS optimization agent.

Candidate:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}

Target Job:
${jobDescription}

Instructions:
1. Extract all info from resume/self-description
2. Tailor every section for the job
3. Use action verbs (Led, Built, Optimized, Increased)
4. Quantify achievements
5. Use job keywords for ATS
6. Use placeholders like "[Your Phone]" if info missing
7. Rate ATS 0-100 with improvement tips

Return complete resume as JSON.`

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumeSchema)
        }
    })

    const text = typeof response?.text === "function" ? response.text() : response?.text
    if (!text) throw new Error("AI did not return resume data.")

    try {
        return JSON.parse(text)
    } catch {
        throw new Error("Invalid JSON returned for resume.")
    }
}

const coverLetterSchema = z.object({
    subject: z.string(),
    greeting: z.string(),
    openingParagraph: z.string(),
    bodyParagraph1: z.string(),
    bodyParagraph2: z.string(),
    closingParagraph: z.string(),
    signOff: z.string(),
    keywordsUsed: z.array(z.string()),
    tone: z.string(),
    wordCount: z.number()
})

async function agentGenerateCoverLetter({ resume, selfDescription, jobDescription }) {
    console.log("agentGenerateCoverLetter called")

    const prompt = `You are an expert cover letter writer.

Candidate:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}

Target Job:
${jobDescription}

Write a compelling personalized cover letter.
Do NOT start with "I am writing to express my interest..."
Keep under 400 words. Sound human and excited.
Use keywords from the job naturally.

Return as JSON.`

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(coverLetterSchema)
        }
    })

    const text = typeof response?.text === "function" ? response.text() : response?.text
    if (!text) throw new Error("AI did not return cover letter.")

    try {
        return JSON.parse(text)
    } catch {
        throw new Error("Invalid JSON for cover letter.")
    }
}

module.exports = {
    agentGenerateNextQuestion,
    agentEvaluateAnswer,
    agentGenerateInterviewSummary,
    agentBuildResume,
    agentGenerateCoverLetter
}