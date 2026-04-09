import React, { useState } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate, useParams } from 'react-router'

const NAV_ITEMS = [
    {
        id: 'technical', label: 'Technical Questions',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
    },
    {
        id: 'behavioral', label: 'Behavioral Questions',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    },
    {
        id: 'roadmap', label: 'Road Map',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
    }
]

const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)
    return (
        <div className='q-card'>
            <div className='q-card__header' onClick={() => setOpen(p => !p)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </div>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks?.map((task, i) => (
                <li key={i}><span className='roadmap-day__bullet' />{task}</li>
            ))}
        </ul>
    </div>
)

const AgentCard = ({ title, description, badgeColor, onClick, icon }) => (
    <button onClick={onClick} className='agent-card'>
        <div className='agent-card__icon'>{icon}</div>
        <div className='agent-card__body'>
            <div className='agent-card__top'>
                <h4 className='agent-card__title'>{title}</h4>
                <span className={`agent-card__badge agent-card__badge--${badgeColor}`}>Agent</span>
            </div>
            <p className='agent-card__desc'>{description}</p>
        </div>
        <svg className='agent-card__arrow' xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
    </button>
)

const Interview = () => {
    const [activeNav, setActiveNav] = useState('technical')
    const { report, loading } = useInterview()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    if (loading || !report) return <main className='loading-screen'><h1>Loading...</h1></main>

    const technicalQuestions = report.technicalQuestions || []
    const behavioralQuestions = report.behavioralQuestions || []
    const preparationPlan = report.preparationPlan || []
    const skillGaps = report.skillGaps || []
    const scoreColor = report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'

    return (
        <div className='interview-page'>
            <div className='interview-layout'>

                {/* LEFT NAV */}
                <nav className='interview-nav'>
                    <div className="nav-content">
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map(item => (
                            <button key={item.id} className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`} onClick={() => setActiveNav(item.id)}>
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}

                        <div className='nav-divider' />
                        <p className='interview-nav__label'>AI Agents</p>

                        <button className='interview-nav__item interview-nav__item--agent' onClick={() => navigate(`/mock-interview/${interviewId}`)}>
                            <span className='interview-nav__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            </span>
                            Mock Interview
                        </button>

                        <button className='interview-nav__item interview-nav__item--agent' onClick={() => navigate(`/resume-builder/${interviewId}`)}>
                            <span className='interview-nav__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            </span>
                            Resume Builder
                        </button>

                        <button className='interview-nav__item interview-nav__item--agent' onClick={() => navigate(`/cover-letter/${interviewId}`)}>
                            <span className='interview-nav__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                            </span>
                            Cover Letter
                        </button>
                    </div>
                </nav>

                <div className='interview-divider' />

                {/* MAIN CONTENT */}
                <main className='interview-content'>
                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {technicalQuestions.map((q, i) => <QuestionCard key={i} item={q} index={i} />)}
                            </div>
                        </section>
                    )}
                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {behavioralQuestions.map((q, i) => <QuestionCard key={i} item={q} index={i} />)}
                            </div>
                        </section>
                    )}
                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Road Map</h2>
                                <span className='content-header__count'>{preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {preparationPlan.map(day => <RoadMapDay key={day.day} day={day} />)}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                {/* SIDEBAR */}
                <aside className='interview-sidebar'>
                    <div className='match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <div className={`match-score__ring ${scoreColor}`}>
                            <span className='match-score__value'>{report.matchScore}</span>
                        </div>
                        <p className='match-score__sub'>
                            {report.matchScore >= 80 ? 'Strong match' : report.matchScore >= 60 ? 'Good match' : 'Needs work'}
                        </p>
                    </div>

                    <div className='sidebar-divider' />

                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {skillGaps.map((gap, i) => (
                                <span key={i} className={`skill-tag skill-tag--${gap.severity}`}>{gap.skill}</span>
                            ))}
                        </div>
                    </div>

                    <div className='sidebar-divider' />

                    <div className='agent-actions'>
                        <p className='skill-gaps__label'>Agentic Tools</p>

                        <AgentCard
                            title="Mock Interview"
                            description="Live AI interview with real-time evaluation"
                            badgeColor="violet"
                            onClick={() => navigate(`/mock-interview/${interviewId}`)}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                        />

                        <AgentCard
                            title="Resume Builder"
                            description="ATS-optimized resume for this job"
                            badgeColor="sky"
                            onClick={() => navigate(`/resume-builder/${interviewId}`)}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                        />

                        <AgentCard
                            title="Cover Letter"
                            description="Personalized letter for this role"
                            badgeColor="emerald"
                            onClick={() => navigate(`/cover-letter/${interviewId}`)}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
                        />
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default Interview