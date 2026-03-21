const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const PDFDocument = require("pdfkit");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z.number(),
  technicalQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    })
  ),
  behavioralQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    })
  ),
  skillGaps: z.array(
    z.object({
      skill: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })
  ),
  preparationPlan: z.array(
    z.object({
      day: z.number(),
      focus: z.string(),
      tasks: z.array(z.string()),
    })
  ),
  title: z.string(),
});

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const prompt = `
Generate an interview report for a candidate.

Resume:
${resume || "Not provided"}

Self Description:
${selfDescription || "Not provided"}

Job Description:
${jobDescription || "Not provided"}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(interviewReportSchema),
    },
  });

  const responseText =
    typeof response?.text === "function" ? response.text() : response?.text;

  if (!response || !responseText) {
    throw new Error("AI did not return interview report.");
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error("Invalid JSON returned by AI.");
  }
}

function stripHtml(html = "") {
  return html
    .replace(/<\/h1>/gi, "\n\n")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<\/h3>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ul>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function generatePdfBufferFromText(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40,
      },
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));

    const lines = text.split("\n");

    doc.fillColor("#222222");

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        doc.moveDown(0.5);
        continue;
      }

      if (
        trimmed.toLowerCase().includes("summary") ||
        trimmed.toLowerCase().includes("skills") ||
        trimmed.toLowerCase().includes("education") ||
        trimmed.toLowerCase().includes("projects") ||
        trimmed.toLowerCase().includes("experience") ||
        trimmed.toLowerCase().includes("certifications")
      ) {
        doc.font("Helvetica-Bold").fontSize(13).text(trimmed);
        doc.moveDown(0.4);
      } else {
        doc.font("Helvetica").fontSize(11).text(trimmed, {
          align: "left",
          lineGap: 3,
        });
      }
    }

    doc.end();
  });
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  const resumeSchema = z.object({
    html: z.string(),
  });

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
- Keep wording concise and resume-like
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(resumeSchema),
    },
  });

  const responseText =
    typeof response?.text === "function" ? response.text() : response?.text;

  if (!response || !responseText) {
    throw new Error("AI did not return resume content.");
  }

  let parsedData;

  try {
    parsedData = JSON.parse(responseText);
  } catch (error) {
    throw new Error("Invalid JSON returned by AI.");
  }

  if (!parsedData?.html) {
    throw new Error("Resume HTML not generated.");
  }

  try {
    const readableText = stripHtml(parsedData.html);
    const pdfBuffer = await generatePdfBufferFromText(readableText);
    return pdfBuffer;
  } catch (error) {
    console.log("PDFKIT PDF ERROR:", error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

module.exports = {
  generateInterviewReport,
  generateResumePdf,
};