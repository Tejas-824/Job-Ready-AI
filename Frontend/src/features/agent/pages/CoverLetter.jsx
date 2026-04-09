import React, { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { generateCoverLetter } from "../services/agent.api"
import "./agent.css"

const CoverLetter = () => {
    const { reportId } = useParams()
    const navigate = useNavigate()
    const [coverLetter, setCoverLetter] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)

    const handleGenerate = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await generateCoverLetter(reportId)
            setCoverLetter(data.coverLetter)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to generate cover letter.")
        } finally {
            setLoading(false)
        }
    }

    const fullText = coverLetter ? [
        coverLetter.greeting, "",
        coverLetter.openingParagraph, "",
        coverLetter.bodyParagraph1, "",
        coverLetter.bodyParagraph2, "",
        coverLetter.closingParagraph, "",
        coverLetter.signOff
    ].join("\n") : ""

    const handleCopy = () => {
        navigator.clipboard.writeText(fullText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="agent-page">
            <header className="agent-header">
                <div className="agent-header__inner">
                    <button onClick={() => navigate(-1)} className="mock-back">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div className="agent-header__title">
                        <span>Cover Letter</span>
                        <span className="agent-badge agent-badge--blue">Agent</span>
                    </div>
                    <div style={{ width: 80 }} />
                </div>
            </header>

            <div className="agent-page__body">
                {!coverLetter && !loading && (
                    <div className="agent-empty">
                        <div className="agent-empty__icon">✉️</div>
                        <h1>Cover Letter Agent</h1>
                        <p>AI will write a compelling, job-specific cover letter — not a generic template.</p>
                        <div className="agent-features">
                            {["Job-Specific", "Keyword Rich", "Human Tone", "Under 400 Words"].map(f => (
                                <span key={f} className="agent-feature-tag">✓ {f}</span>
                            ))}
                        </div>
                        {error && <div className="agent-error-box">{error}</div>}
                        <button onClick={handleGenerate} className="agent-btn agent-btn--blue agent-btn--lg">
                            Generate Cover Letter
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="agent-loading">
                        <div className="agent-spinner agent-spinner--blue" />
                        <p>Agent is writing your cover letter...</p>
                        <span>Analyzing job requirements and crafting your story...</span>
                    </div>
                )}

                {coverLetter && !loading && (
                    <div className="cl-wrap">
                        {/* meta bar */}
                        <div className="cl-meta-bar">
                            <div className="cl-meta-tags">
                                <span className="agent-badge agent-badge--blue">{coverLetter.tone} Tone</span>
                                <span className="agent-badge agent-badge--gray">{coverLetter.wordCount} words</span>
                            </div>
                            <div className="cl-actions">
                                <button onClick={handleGenerate} className="agent-btn agent-btn--ghost">↺ Regenerate</button>
                                <button onClick={handleCopy} className="agent-btn agent-btn--blue">
                                    {copied ? "✓ Copied!" : "⎘ Copy"}
                                </button>
                            </div>
                        </div>

                        {coverLetter.subject && (
                            <div className="cl-subject">
                                <span className="cl-subject__label">Subject: </span>
                                <span>{coverLetter.subject}</span>
                            </div>
                        )}

                        <div className="cl-card">
                            <p className="cl-greeting">{coverLetter.greeting}</p>
                            <p className="cl-para">{coverLetter.openingParagraph}</p>
                            <p className="cl-para">{coverLetter.bodyParagraph1}</p>
                            <p className="cl-para">{coverLetter.bodyParagraph2}</p>
                            <p className="cl-para">{coverLetter.closingParagraph}</p>
                            <p className="cl-greeting" style={{ paddingTop: 8 }}>{coverLetter.signOff}</p>
                        </div>

                        {coverLetter.keywordsUsed?.length > 0 && (
                            <div className="cl-keywords">
                                <p className="cl-keywords__label">Keywords Used</p>
                                <div className="resume-skills">
                                    {coverLetter.keywordsUsed.map((k, i) => (
                                        <span key={i} className="resume-skill-tag resume-skill-tag--green">{k}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CoverLetter