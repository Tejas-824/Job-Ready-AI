import { createBrowserRouter } from "react-router"
import Login from "./features/auth/pages/Login"
import Register from "./features/auth/pages/Register"
import Protected from "./features/auth/components/Protected"
import Home from "./features/interview/pages/Home"
import Interview from "./features/interview/pages/Interview"
import MockInterview from "./features/agent/pages/MockInterview"
import ResumeBuilder from "./features/agent/pages/ResumeBuilder"
import CoverLetter from "./features/agent/pages/CoverLetter"

export const router = createBrowserRouter([
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
    { path: "/", element: <Protected><Home /></Protected> },
    { path: "/interview/:interviewId", element: <Protected><Interview /></Protected> },

    { path: "/mock-interview/:reportId", element: <Protected><MockInterview /></Protected> },
    { path: "/resume-builder/:reportId", element: <Protected><ResumeBuilder /></Protected> },
    { path: "/cover-letter/:reportId", element: <Protected><CoverLetter /></Protected> }
])