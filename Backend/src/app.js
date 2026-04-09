const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use(cors({
    origin: [
        "http://localhost:5173",
        process.env.CLIENT_URL
    ],
    credentials: true
}))

app.get("/", (req, res) => {
    res.status(200).send("Backend is running successfully")
})

const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
const agentRouter = require("./routes/agent.routes")

app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)
app.use("/api/agent", agentRouter)

module.exports = app