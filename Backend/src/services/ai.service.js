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
        description: "Evaluates the candidate's answer. Returns score, feedback, and what a strong answer looks like.",
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
        description: "Generates final summary of the mock interview with overall score and recommendations.",
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

async function agentGenerateNextQuestion({ resume, selfDescription, jobDescription, conversationHistory, questionNumber, totalQuestions }) {
    const systemPrompt = `You are an expert technical interviewer agent.

Job Description:
${jobDescription}

Candidate Profile:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}

You are asking question ${questionNumber} of ${totalQuestions}.
Previous conversation: ${JSON.stringify(conversationHistory)}

Rules:
- Questions 1-3: Technical questions, increasing difficulty
- Questions 4-5: Situational/problem-solving questions
- Questions 6-7: Behavioral questions (STAR method)
- If candidate gave a vague answer, use follow_up type
- Always provide a useful hint

You MUST call the generate_interview_question tool. Do not respond in plain text.`

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
        hint: "Use the STAR method: Situation, Task, Action, Result."
    }
}

async function agentEvaluateAnswer({ question, answer, jobDescription, questionType, topic }) {
    const systemPrompt = `You are an expert interviewer evaluating a candidate's answer.

Job Description Context:
${jobDescription}

Question Asked: ${question}
Question Type: ${questionType}
Topic: ${topic}

Candidate's Answer:
${answer}

Scoring Guide:
- 0-3: Poor (missed key concepts, too vague)
- 4-6: Average (covered basics but lacking depth)
- 7-8: Good (solid answer with examples)
- 9-10: Excellent (comprehensive, quantified, impressive)

You MUST call the evaluate_answer tool.`

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
        feedback: "Your answer showed basic understanding. Try to include specific examples.",
        strongAnswerExample: "A stronger answer would include specific examples with measurable outcomes.",
        keyPointsCovered: ["Basic understanding"],
        keyPointsMissed: ["Specific examples", "Quantifiable results"]
    }
}

async function agentGenerateInterviewSummary({ jobDescription, conversationHistory, evaluations }) {
    const avgScore = evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / evaluations.length
        : 0

    const systemPrompt = `You are generating a final mock interview summary.

Job Description:
${jobDescription}

Full Interview Transcript:
${JSON.stringify(conversationHistory)}

Question Scores:
${JSON.stringify(evaluations.map((e, i) => ({ question: i + 1, score: e.score, topic: e.topic })))}

Average Score: ${avgScore.toFixed(1)} / 10

Be constructive, specific, and actionable.
You MUST call the generate_interview_summary tool.`

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
    const prompt = `You are an expert resume writer and ATS optimization agent.

Candidate Info:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}

Target Job:
${jobDescription}

Instructions:
1. Extract all candidate info from resume/self-description
2. Tailor EVERY section specifically for the job
3. Use strong action verbs (Led, Built, Optimized, Reduced, Increased)
4. Quantify achievements where possible
5. Use keywords from the job description for ATS optimization
6. If info is missing, use placeholders like "[Your Phone]"
7. Rate ATS score 0-100 and give specific improvement tips
8. Make summary compelling and job-specific

Return complete ATS-optimized resume as JSON.`

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
    const prompt = `You are an expert cover letter writer.

Candidate Info:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}

Target Job:
${jobDescription}

Instructions:
1. Analyze what the company values most from the job description
2. Match candidate strengths to those requirements
3. Write a compelling, personalized cover letter — NOT a generic template
4. DO NOT start with "I am writing to express my interest..."
5. Opening should immediately grab attention
6. Body tells a story connecting candidate experience to the role
7. Closing is confident with clear call-to-action
8. Keep under 400 words
9. Sound human, specific, and genuinely excited
10. Use keywords from job description naturally

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