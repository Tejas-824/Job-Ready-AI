import React, { useState, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { startMockInterview, submitAnswer } from "../services/agent.api"
import "./agent.css"

const ScoreRing = ({ score }) => {
    const color = score >= 8 ? "#16a34a" : score >= 6 ? "#d97706" : "#dc2626"
    return (
        <div className="score-ring-wrap">
            <div className="score-ring" style={{ borderColor: color, color }}>{score}</div>
            <span className="score-ring-label">/10</span>
        </div>
    )
}

const EvaluationPanel = ({ evaluation, isOpen, onToggle }) => {
    if (!evaluation) return null
    return (
        <div className="eval-panel">
            <button onClick={onToggle} className="eval-panel__toggle">
                <span>View AI Feedback</span>
                <svg className={`eval-chevron ${isOpen ? "eval-chevron--open" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="eval-panel__body">
                    <div className="eval-top">
                        <ScoreRing score={evaluation.score} />
                        <p className="eval-feedback">{evaluation.feedback}</p>
                    </div>
                    {evaluation.keyPointsCovered?.length > 0 && (
                        <div>
                            <p className="eval-tag-label eval-tag-label--green">✓ Points Covered</p>
                            <div className="eval-tags">
                                {evaluation.keyPointsCovered.map((p, i) => (
                                    <span key={i} className="eval-tag eval-tag--green">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {evaluation.keyPointsMissed?.length > 0 && (
                        <div>
                            <p className="eval-tag-label eval-tag-label--red">✗ Points Missed</p>
                            <div className="eval-tags">
                                {evaluation.keyPointsMissed.map((p, i) => (
                                    <span key={i} className="eval-tag eval-tag--red">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="eval-example">
                        <p className="eval-example__label">Strong Answer Example</p>
                        <p className="eval-example__text">{evaluation.strongAnswerExample}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

const SummaryScreen = ({ summary, onBack }) => {
    const scoreColor = summary.overallScore >= 75 ? "#16a34a" : summary.overallScore >= 50 ? "#d97706" : "#dc2626"
    return (
        <div className="summary-screen">
            <div className="summary-card">
                <div className="summary-top">
                    <span className="summary-badge">✓ Interview Complete</span>
                    <div className="summary-score" style={{ color: scoreColor }}>{summary.overallScore}</div>
                    <p className="summary-score-label">out of 100</p>
                </div>

                <div className="summary-section">
                    <p className="summary-perf">{summary.performanceSummary}</p>
                </div>

                <div className="summary-grid">
                    <div className="summary-area summary-area--green">
                        <p className="summary-area__label">Strong Areas</p>
                        <ul>
                            {summary.strongAreas?.map((a, i) => (
                                <li key={i}><span style={{ color: "#16a34a" }}>✓</span> {a}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="summary-area summary-area--red">
                        <p className="summary-area__label">Needs Work</p>
                        <ul>
                            {summary.improvementAreas?.map((a, i) => (
                                <li key={i}><span style={{ color: "#dc2626" }}>→</span> {a}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="summary-steps">
                    <p className="summary-steps__label">Next Steps</p>
                    <ul>
                        {summary.nextSteps?.map((s, i) => (
                            <li key={i}><span className="summary-steps__num">{i + 1}.</span> {s}</li>
                        ))}
                    </ul>
                </div>

                <button onClick={onBack} className="agent-btn agent-btn--primary">Back to Interview Plan</button>
            </div>
        </div>
    )
}

const MockInterview = () => {
    const { reportId } = useParams()
    const navigate = useNavigate()
    const [session, setSession] = useState(null)
    const [answer, setAnswer] = useState("")
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [openEvals, setOpenEvals] = useState({})
    const [showHint, setShowHint] = useState(false)
    const [summary, setSummary] = useState(null)
    const bottomRef = useRef(null)

    useEffect(() => {
        const init = async () => {
            try {
                const data = await startMockInterview(reportId)
                setSession(data.session)
            } catch (err) {
                setError(err.response?.data?.message || "Failed to start interview.")
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [reportId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [session?.messages, submitting])

    const handleSubmit = async () => {
        if (!answer.trim() || submitting) return
        setSubmitting(true)
        setShowHint(false)
        try {
            const data = await submitAnswer(session._id, answer.trim())
            setSession(data.session)
            setAnswer("")
            if (data.isCompleted) setSummary(data.summary)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && e.ctrlKey) handleSubmit()
    }

    if (loading) {
        return (
            <div className="agent-loading">
                <div className="agent-spinner" />
                <p>Agent is preparing your interview...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="agent-loading">
                <p className="agent-error">{error}</p>
                <button onClick={() => navigate(-1)} className="agent-btn agent-btn--ghost">Go Back</button>
            </div>
        )
    }

    if (summary) return <SummaryScreen summary={summary} onBack={() => navigate(`/interview/${reportId}`)} />
    if (!session) return null

    const messages = session.messages || []
    const progress = (session.currentQuestionNumber / session.totalQuestions) * 100
    const lastAgentMsg = [...messages].reverse().find(m => m.role === "agent")

    return (
        <div className="mock-page">
            {/* Header */}
            <header className="mock-header">
                <div className="mock-header__inner">
                    <button onClick={() => navigate(-1)} className="mock-back">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>

                    <div className="mock-progress">
                        <span className="mock-progress__text">Q{session.currentQuestionNumber} / {session.totalQuestions}</span>
                        <div className="mock-progress__bar">
                            <div className="mock-progress__fill" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    <div className="mock-live-badge">
                        <div className="mock-live-dot" />
                        Live
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="mock-messages">
                {messages.map((msg, i) => {
                    const isAgent = msg.role === "agent"
                    return (
                        <div key={i} className={`mock-msg ${isAgent ? "mock-msg--agent" : "mock-msg--user"}`}>
                            <div className={`mock-avatar ${isAgent ? "mock-avatar--ai" : "mock-avatar--user"}`}>
                                {isAgent ? "AI" : "You"}
                            </div>

                            <div className="mock-msg__content">
                                {isAgent && msg.questionMeta && (
                                    <div className="mock-msg__meta">
                                        {msg.questionMeta.questionType && (
                                            <span className={`mock-tag mock-tag--type mock-tag--${msg.questionMeta.questionType}`}>
                                                {msg.questionMeta.questionType.replace("_", " ")}
                                            </span>
                                        )}
                                        {msg.questionMeta.difficulty && (
                                            <span className={`mock-tag mock-tag--diff mock-tag--${msg.questionMeta.difficulty}`}>
                                                {msg.questionMeta.difficulty}
                                            </span>
                                        )}
                                        {msg.questionMeta.topic && (
                                            <span className="mock-tag mock-tag--topic">{msg.questionMeta.topic}</span>
                                        )}
                                    </div>
                                )}
                                <div className={`mock-bubble ${isAgent ? "mock-bubble--agent" : "mock-bubble--user"}`}>
                                    {msg.content}
                                </div>
                                {msg.role === "user" && msg.evaluation && (
                                    <EvaluationPanel
                                        evaluation={msg.evaluation}
                                        isOpen={openEvals[i] || false}
                                        onToggle={() => setOpenEvals(p => ({ ...p, [i]: !p[i] }))}
                                    />
                                )}
                            </div>
                        </div>
                    )
                })}

                {submitting && (
                    <div className="mock-msg mock-msg--agent">
                        <div className="mock-avatar mock-avatar--ai">AI</div>
                        <div className="mock-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            {session.status === "in_progress" && (
                <div className="mock-input-bar">
                    <div className="mock-input-bar__inner">
                        {lastAgentMsg?.questionMeta?.hint && (
                            <div className="mock-hint-wrap">
                                <button onClick={() => setShowHint(p => !p)} className="mock-hint-btn">
                                    💡 {showHint ? "Hide hint" : "Show hint"}
                                </button>
                                {showHint && (
                                    <div className="mock-hint-text">{lastAgentMsg.questionMeta.hint}</div>
                                )}
                            </div>
                        )}
                        <div className="mock-input-row">
                            <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your answer... (Ctrl+Enter to submit)"
                                rows={3}
                                disabled={submitting}
                                className="mock-textarea"
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !answer.trim()}
                                className="mock-send-btn"
                            >
                                {submitting
                                    ? <div className="mock-send-spinner" />
                                    : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                }
                            </button>
                        </div>
                        <p className="mock-input-hint">Ctrl+Enter to submit · Be specific and use real examples</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MockInterview