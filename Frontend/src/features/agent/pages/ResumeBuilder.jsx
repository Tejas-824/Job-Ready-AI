import React, { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { buildResume } from "../services/agent.api"
import "./agent.css"

const ResumeSection = ({ title }) => (
    <div className="resume-section-header">
        <span className="resume-section-title">{title}</span>
    </div>
)

const ResumeView = ({ data, onDownload }) => (
    <div className="resume-wrap">
        {/* Top bar */}
        <div className="resume-topbar">
            <div className={`ats-badge ${data.atsScore >= 80 ? "ats-badge--green" : data.atsScore >= 60 ? "ats-badge--amber" : "ats-badge--red"}`}>
                ✓ ATS Score: {data.atsScore}/100
            </div>
            <button onClick={onDownload} className="agent-btn agent-btn--primary">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
            </button>
        </div>

        {/* Resume card */}
        <div id="resume-content" className="resume-card">
            <div className="resume-card__header">
                <h1 className="resume-name">{data.name}</h1>
                <p className="resume-role">{data.tailoredFor}</p>
                <div className="resume-contact">
                    {data.email && <span>✉ {data.email}</span>}
                    {data.phone && <span>✆ {data.phone}</span>}
                    {data.location && <span>⌖ {data.location}</span>}
                </div>
            </div>

            <div className="resume-card__body">
                <div className="resume-sec">
                    <ResumeSection title="Professional Summary" />
                    <p className="resume-summary">{data.summary}</p>
                </div>

                <div className="resume-sec">
                    <ResumeSection title="Skills" />
                    <div className="resume-skills">
                        {data.skills?.map((s, i) => <span key={i} className="resume-skill-tag">{s}</span>)}
                    </div>
                </div>

                {data.experience?.length > 0 && (
                    <div className="resume-sec">
                        <ResumeSection title="Experience" />
                        {data.experience.map((exp, i) => (
                            <div key={i} className="resume-exp">
                                <div className="resume-exp__head">
                                    <div>
                                        <p className="resume-exp__title">{exp.title}</p>
                                        <p className="resume-exp__company">{exp.company}</p>
                                    </div>
                                    <span className="resume-exp__duration">{exp.duration}</span>
                                </div>
                                <ul className="resume-exp__list">
                                    {exp.achievements?.map((a, j) => <li key={j}>{a}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {data.projects?.length > 0 && (
                    <div className="resume-sec">
                        <ResumeSection title="Projects" />
                        <div className="resume-projects">
                            {data.projects.map((p, i) => (
                                <div key={i} className="resume-project">
                                    <p className="resume-project__name">{p.name}</p>
                                    <p className="resume-project__desc">{p.description}</p>
                                    <p className="resume-project__impact">{p.impact}</p>
                                    <div className="resume-project__tech">
                                        {p.technologies?.map((t, j) => <span key={j}>{t}</span>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.education?.length > 0 && (
                    <div className="resume-sec">
                        <ResumeSection title="Education" />
                        {data.education.map((e, i) => (
                            <div key={i} className="resume-edu">
                                <div>
                                    <p className="resume-edu__degree">{e.degree}</p>
                                    <p className="resume-edu__inst">{e.institution}</p>
                                </div>
                                <span className="resume-edu__year">{e.year}</span>
                            </div>
                        ))}
                    </div>
                )}

                {data.certifications?.length > 0 && (
                    <div className="resume-sec">
                        <ResumeSection title="Certifications" />
                        <div className="resume-skills">
                            {data.certifications.map((c, i) => <span key={i} className="resume-skill-tag resume-skill-tag--blue">{c}</span>)}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {data.atsTips?.length > 0 && (
            <div className="ats-tips">
                <p className="ats-tips__label">💡 ATS Optimization Tips</p>
                <ul>
                    {data.atsTips.map((tip, i) => <li key={i}><strong>{i + 1}.</strong> {tip}</li>)}
                </ul>
            </div>
        )}
    </div>
)

const ResumeBuilder = () => {
    const { reportId } = useParams()
    const navigate = useNavigate()
    const [resumeData, setResumeData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleBuild = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await buildResume(reportId)
            setResumeData(data.resumeData)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to build resume.")
        } finally {
            setLoading(false)
        }
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
                        <span>Resume Builder</span>
                        <span className="agent-badge agent-badge--indigo">Agent</span>
                    </div>
                    <div style={{ width: 80 }} />
                </div>
            </header>

            <div className="agent-page__body">
                {!resumeData && !loading && (
                    <div className="agent-empty">
                        <div className="agent-empty__icon">📄</div>
                        <h1>Resume Builder Agent</h1>
                        <p>AI will build a fully tailored, ATS-optimized resume from your profile and the job description.</p>
                        <div className="agent-features">
                            {["ATS Optimized", "Keyword Matched", "Action Verbs", "Quantified Impact"].map(f => (
                                <span key={f} className="agent-feature-tag">✓ {f}</span>
                            ))}
                        </div>
                        {error && <div className="agent-error-box">{error}</div>}
                        <button onClick={handleBuild} className="agent-btn agent-btn--primary agent-btn--lg">
                            Build My Resume
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="agent-loading">
                        <div className="agent-spinner agent-spinner--indigo" />
                        <p>Agent is crafting your resume...</p>
                        <span>Optimizing for ATS and tailoring for the role...</span>
                    </div>
                )}

                {resumeData && !loading && (
                    <ResumeView data={resumeData} onDownload={() => window.print()} />
                )}
            </div>

            <style>{`@media print { header, .agent-header { display: none !important; } }`}</style>
        </div>
    )
}

export default ResumeBuilder