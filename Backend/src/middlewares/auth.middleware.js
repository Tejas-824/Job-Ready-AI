const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

async function authUser(req, res, next) {
    try {
        const token = req.cookies?.token

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token not provided"
            })
        }

        const blacklistedToken = await tokenBlacklistModel.findOne({ token })

        if (blacklistedToken) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        })
    }
}

module.exports = { authUser }