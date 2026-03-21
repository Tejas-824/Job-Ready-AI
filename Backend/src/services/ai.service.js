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

    console.log("INTERVIEW AI FULL RESPONSE:", response)

    const responseText =
        typeof response?.text === "function" ? response.text() : response?.text

    console.log("INTERVIEW AI RESPONSE TEXT:", responseText)

    if (!response || !responseText) {
        throw new Error("AI did not return interview report.")
    }

    try {
        return JSON.parse(responseText)
    } catch (error) {
        console.log("INTERVIEW AI JSON PARSE ERROR:", error)
        console.log("INTERVIEW RAW AI RESPONSE TEXT:", responseText)
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

    console.log("RESUME PDF STARTED")
    console.log("RESUME LENGTH:", resume ? resume.length : 0)
    console.log("SELF DESCRIPTION LENGTH:", selfDescription ? selfDescription.length : 0)
    console.log("JOB DESCRIPTION LENGTH:", jobDescription ? jobDescription.length : 0)

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumeSchema),
        }
    })

    console.log("RESUME AI FULL RESPONSE:", response)

    const responseText =
        typeof response?.text === "function" ? response.text() : response?.text

    console.log("RESUME AI RESPONSE TEXT:", responseText)

    if (!response || !responseText) {
        throw new Error("AI did not return resume content.")
    }

    let parsedData

    try {
        parsedData = JSON.parse(responseText)
    } catch (error) {
        console.log("RESUME AI JSON PARSE ERROR:", error)
        console.log("RESUME RAW AI RESPONSE TEXT:", responseText)
        throw new Error("Invalid JSON returned by AI.")
    }

    if (!parsedData?.html) {
        console.log("RESUME PARSED DATA:", parsedData)
        throw new Error("Resume HTML not generated.")
    }

    const fullHtml = wrapHtml(parsedData.html)

    console.log("FULL HTML GENERATED")
    console.log("FULL HTML LENGTH:", fullHtml.length)

    let browser

    try {
        console.log("PUPPETEER LAUNCH START")
        console.log("PUPPETEER EXECUTABLE PATH:", puppeteer.executablePath())

        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote"
            ]
        })

        console.log("PUPPETEER LAUNCHED")

        const page = await browser.newPage()
        console.log("NEW PAGE CREATED")

        await page.setContent(fullHtml, { waitUntil: "load" })
        console.log("HTML SET ON PAGE")

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

        console.log("PDF BUFFER GENERATED:", pdfBuffer ? pdfBuffer.length : 0)

        return Buffer.from(pdfBuffer)
    } catch (error) {
        console.log("PUPPETEER PDF ERROR:", error)
        throw new Error(`Failed to generate PDF: ${error.message}`)
    } finally {
        if (browser) {
            await browser.close()
            console.log("PUPPETEER CLOSED")
        }
    }
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
}