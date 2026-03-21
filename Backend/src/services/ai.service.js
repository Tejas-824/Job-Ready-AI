const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const interviewReportSchema = z.object({
    matchScore: z.number(),
    technicalQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),
    behavioralQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),
    skillGaps: z.array(
        z.object({
            skill: z.string(),
            severity: z.enum(["low", "medium", "high"])
        })
    ),
    preparationPlan: z.array(
        z.object({
            day: z.number(),
            focus: z.string(),
            tasks: z.array(z.string())
        })
    ),
    title: z.string()
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `
Generate an interview report for a candidate.

Resume:
${resume || "Not provided"}

Self Description:
${selfDescription || "Not provided"}

Job Description:
${jobDescription || "Not provided"}
`

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    const responseText =
        typeof response?.text === "function" ? response.text() : response?.text

    if (!response || !responseText) {
        throw new Error("AI did not return interview report.")
    }

    try {
        return JSON.parse(responseText)
    } catch (error) {
        throw new Error("Invalid JSON returned by AI.")
    }
}

function wrapHtml(bodyContent) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Resume</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 30px;
                color: #222;
                line-height: 1.5;
            }
            h1, h2, h3 {
                margin-bottom: 8px;
            }
            p {
                margin: 6px 0;
            }
            ul {
                margin: 6px 0 12px 20px;
            }
            li {
                margin-bottom: 4px;
            }
            hr {
                margin: 16px 0;
                border: none;
                border-top: 1px solid #ccc;
            }
        </style>
    </head>
    <body>
        ${bodyContent}
    </body>
    </html>
    `
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const resumeSchema = z.object({
        html: z.string()
    })

    const prompt = `
Generate a professional ATS-friendly resume in HTML format.

Candidate Resume:
${resume || "Not provided"}

Self Description:
${selfDescription || "Not provided"}

Target Job Description:
${jobDescription || "Not provided"}

Instructions:
- Return only JSON
- JSON should contain only one key: "html"
- "html" should contain only resume body content, not full HTML document
- Make the resume clean, professional and ATS-friendly
- Use sections like Summary, Skills, Education, Projects, Experience if relevant
`

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumeSchema),
        }
    })

    const responseText =
        typeof response?.text === "function" ? response.text() : response?.text

    if (!response || !responseText) {
        throw new Error("AI did not return resume content.")
    }

    let parsedData

    try {
        parsedData = JSON.parse(responseText)
    } catch (error) {
        throw new Error("Invalid JSON returned by AI.")
    }

    if (!parsedData?.html) {
        throw new Error("Resume HTML not generated.")
    }

    const fullHtml = wrapHtml(parsedData.html)

    let browser

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote"
            ]
        })

        const page = await browser.newPage()
        await page.setContent(fullHtml, { waitUntil: "load" })

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                right: "15mm",
                bottom: "20mm",
                left: "15mm"
            }
        })

        return Buffer.from(pdfBuffer)
    } catch (error) {
        console.log("PUPPETEER PDF ERROR:", error)
        throw new Error(`Failed to generate PDF: ${error.message}`)
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
}