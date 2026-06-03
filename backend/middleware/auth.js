import jwt from "jsonwebtoken"
import { User } from "../models/User.js"

// [KRAV K6] Autentiseringsmiddleware (STRIDE: Elevation of Privilege)
// OWASP A01: Broken Access Control

// Denna middleware verifierar JWT-token och sätter req.user.
// KRITISKT: Den MÅSTE användas på alla endpoints som ändrar data (POST, PATCH, DELETE).
// BUGGEN som hittades i Fas 1: DELETE /messages/:id saknade denna middleware helt,
// vilket innebar att vem som helst kunde radera vilkens meddelande som helst.

export const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" })
  }
  try {
    // [KRAV K4] JWT_SECRET hämtas från .env aldrig hårdkodat
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" })
    }
    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token" })
  }
}
