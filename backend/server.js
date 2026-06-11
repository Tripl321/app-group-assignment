import "dotenv/config"
import helmet from "helmet"
import cors from "cors"
import express from "express"
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import rateLimit from "express-rate-limit" // [KRAV K5] Nytt paket: npm install express-rate-limit
import { Message } from "./models/Message.js"
import { User } from "./models/User.js"
import { Comment } from "./models/Comment.js"
import { authenticateUser } from "./middleware/auth.js"
import "./config/db.js"

const KAREN_REPLIES = [
  "Så får man inte skriva. Jag vill prata med din chef!",
  "Det här är inte vad jag beställde. Jag vill ha en ny!",
  "Hur vågar du? Jag ska prata med din chef!",
  "Detta är helt oacceptabelt! Jag kräver att få tala med någon ansvarig!",
  "Jag har aldrig blivit så dåligt behandlad! Namn och adress på din chef, tack!",
  "Ursäkta mig? Det där var inte alls professionellt. Jag vill prata med din chef omedelbart!",
  "Nej men hallå! Så gör man bara inte. Jag ringer konsumentverket!",
  "Är det så här ni behandlar era kunder? Jag vill ha ett namn!",
  "Det där var sista gången jag handlar här. Jag tänker berätta för alla jag känner om denna dåliga service!",
  "Oacceptabelt! Jag ska skriva ett ilsket inlägg på Facebook om detta!",
]

// [KRAV K4] Borttagen: import listEndpoints from "express-list-endpoints"
// Motivering: Exponerade alla API-endpoints för angripare. Borttagen för att minska attackytan.

// [KRAV K4] JWT_SECRET hämtas från .env, aldrig hårdkodat i koden.
// Om .env saknas kraschar servern direkt istället för att köra med en osäker konfiguration.
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in .env")

const PORT = process.env.PORT || "3000"
const app = express()
app.use(helmet())

// [KRAV K4] CORS — Skyddade hemligheter & säker konfiguration
// FÖRE: cors({ origin: "*" }) tillät alla domäner att anropa vårt API.
// EFTER: Begränsat till specifika origins via miljövariabel CORS_ORIGIN.
// Motivering (OWASP A02 Security Misconfiguration): Wildcard-CORS låter skadliga webbsidor göra API-anrop i inloggade användares namn.

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"]

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

app.use(express.json())

const sanitize = (obj) => {
  if (typeof obj !== "object" || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(sanitize)
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !key.startsWith("$"))
      .map(([key, val]) => [key, sanitize(val)])
  )
}

app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body)
  next()
})

// [KRAV K5] Rate Limiting — Hastighetsbegränsning (STRIDE: Denial of Service)
// OWASP A07: Authentication Failures
//
// FÖRE: Ingen begränsning alls — en angripare kunde skicka obegränsat antal anrop och antingen brute force:a lösenord eller överbelasta servern.
// EFTER: Två nivåer:
// - Generell: max 100 anrop per 15 min (skyddar hela API:et)
// - Auth-specifik: max 10 anrop per 15 min på /login och /register (stoppar brute force-attacker mot inloggningen)

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please try again later" },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many login attempts, please try again later" },
})

app.use(generalLimiter)

// [KRAV K4] Borttagen: app.get("/", (req, res) => res.send(listEndpoints(app)))
// Motivering: Rot-endpointen listade alla API-endpoints, en komplett attackkarta.
app.get("/", (req, res) => {
  res.json({ message: "YH Message App API" })
})

// [KRAV K1] Spoofing: Lösenordslös inloggning (Passkeys / WebAuthn)
// OWASP A07: Authentication Failures

// NULÄGE: Appen använder lösenordsbaserad autentisering med bcrypt + JWT.
// Lösenord kan phishas, brute force:as eller läcka via dataintrång.

// FRAMTIDA IMPLEMENTATION:
// - Installera paketet @simplewebauthn/server
// - Skapa nya endpoints: POST /auth/passkey/register och POST /auth/passkey/login
// - Spara den publika nyckeln (credentialPublicKey) i User-modellen
// - Passkeys är kryptografiskt bundna till domänen
// - Befintlig /register och /login behålls som fallback under övergångsperioden

// Varför vi inte implementerar det nu: WebAuthn kräver HTTPS i produktion och en omstrukturering av hela auth-flödet (frontend + backend).
// Kravet är formulerat och redo att implementeras i en framtida sprint.


app.post("/register", authLimiter, async (req, res) => {
  // [KRAV K5] authLimiter tillagd — max 10 registreringsförsök per 15 min per IP
  try {
    const { email, password, username } = req.body

    if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Invalid input format" })
    }

    if (username.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Username must be at least 2 characters" })
    }

    const existingUser = await User.findOne({
      $or: [{ email: { $eq: email.toLowerCase() } }, { username: { $eq: username.trim() } }]
    }).lean()

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "email" : "username"
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ username: username.trim(), email, password: hashedPassword })
    await user.save()

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    // [KRAV K4] FÖRE: error: error — skickade hela Mongoose-felobjektet till klienten.
    // EFTER: Generiskt meddelande till klienten, detaljer loggas server-side.
    // Motivering: Felobjektet kan avslöja databasstruktur och interna detaljer.
    console.error("Register error:", error)
    res.status(400).json({
      success: false,
      message: "Could not create user",
    })
  }
})

app.post("/login", authLimiter, async (req, res) => {
  // [KRAV K5] authLimiter tillagd — max 10 inloggningsförsök per 15 min per IP
  try {
    const { login, password } = req.body

    if (typeof login !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Invalid input format" })
    }

    const user = await User.findOne({
      $or: [{ username: { $eq: login } }, { email: { $eq: login } }]
    }).lean()

    // [KRAV K6 / K1] Säkerhetsförbättring: Generiska felmeddelanden
    // STRIDE: Spoofing (förhindrar user enumeration)
    // 
    // FÖRE: Två olika meddelanden:
    //   "No account found with that username or email" (kontot finns inte)
    //   "Password is incorrect" (kontot finns men lösenordet är fel)
    // PROBLEM: En angripare kan kartlägga vilka konton som existerar genom
    //          att testa användarnamn och se vilket meddelande som returneras.
    // EFTER: Samma meddelande i båda fallen.
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
        response: null,
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password", // Samma meddelande som ovan
        response: null,
      })
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.json({
      success: true,
      message: "Logged in successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    })
  }
})

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: "desc" })
      .limit(20)
      .populate("user", "username")
      .exec()
    res.json(messages)
  } catch (error) {
    console.error("Fetch messages error:", error)
    res.status(500).json({ message: "Could not fetch messages" })
  }
})

app.post("/messages", authenticateUser, async (req, res) => {
  // [KRAV K2] Indatavalidering sker via Mongoose-schemat (se models/Message.js)
  // som kräver minlength: 3, maxlength: 140, trim: true.
  // Vi trimmar även här för konsekvent hantering.
  if (typeof req.body.message !== "string") {
    return res.status(400).json({ message: "Message must be a string" })
  }
  const trimmedMessage = req.body.message.trim()
  const message = new Message({ message: trimmedMessage, user: req.user._id })
  try {
    const saved = await message.save()
    const populated = await saved.populate("user", "username")
    res.status(201).json(populated)
  } catch (err) {
    res.status(400).json({ message: "Could not save message", errors: err.errors })
  }
})

app.patch("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    // [KRAV K6] Auktoriseringskontroll — ägarkontroll (STRIDE: Elevation of Privilege)
    // OWASP A01: Broken Access Control
    //
    // Denna kontroll fanns redan i PATCH. Vi jämför meddelandets user-fält
    // (author_id) mot den inloggade användarens ID från JWT-token.
    // Om de inte matchar → 403 Forbidden. Frontenden kan inte kringgå detta.
    
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" })
    }

    // [KRAV K2] Konsekvent fältnamn: "message" istället för "editedMessage"
    if (typeof req.body.message !== "string") {
      return res.status(400).json({ error: "Message must be a string" })
    }
    message.message = req.body.message.trim()
    await message.save() // Mongoose-validering (minlength/maxlength) körs här
    const updated = await message.populate("user", "username")

    // [KRAV K3] Granskningslogg — logga ändringen
    console.log(JSON.stringify({
      event: "MESSAGE_UPDATED",
      userId: req.user._id,
      messageId: message._id,
      timestamp: new Date().toISOString(),
    }))

    res.json(updated)
  } catch (error) {
    console.error("Update message error:", error)
    res.status(400).json({ error: "Could not update message" })
  }
})

// [KRAV K6] DELETE - Kritisk säkerhetsfix (STRIDE: Elevation of Privilege)
// OWASP A01: Broken Access Control

// FÖRE: app.delete("/messages/:id", async (req, res) => { ... })
// - Ingen authenticateUser-middleware → vem som helst kunde anropa endpointen
// - Ingen ägarkontroll → vilkens meddelande som helst kunde raderas
// - En angripare behövde bara ett meddelande-ID och ett curl-kommando
//
// EFTER: authenticateUser tillagd + ägarkontroll som jämför message.user mot req.user._id (samma mönster som PATCH redan använde)

app.delete("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    // [KRAV K6] Ägarkontroll — samma mönster som PATCH
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" })
    }

    await message.deleteOne()

    // [KRAV K3] Granskningslogg — logga raderingen med tidsstämpel och användar-ID
    // STRIDE: Repudiation — utan denna logg kan en användare förneka att de raderat data
    // OWASP A09: Security Logging & Monitoring Failures
    console.log(JSON.stringify({
      event: "MESSAGE_DELETED",
      userId: req.user._id,
      messageId: req.params.id,
      timestamp: new Date().toISOString(),
    }))

    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: "Could not delete message" })
  }
})

app.get("/messages/:id/comments", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const comments = await Comment.find({ message: req.params.id })
      .sort({ createdAt: "asc" })
      .populate("user", "username")
      .exec()
    res.json(comments)
  } catch (error) {
    res.status(500).json({ message: "Could not fetch comments" })
  }
})

app.post("/messages/:id/comments", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    if (typeof req.body.text !== "string") {
      return res.status(400).json({ error: "Comment must be a string" })
    }
    const trimmedText = req.body.text.trim()
    if (trimmedText.length < 1) {
      return res.status(400).json({ error: "Comment cannot be empty" })
    }

    const comment = new Comment({
      text: trimmedText,
      user: req.user._id,
      message: req.params.id,
    })
    const saved = await comment.save()
    const populated = await saved.populate("user", "username")

    const randomReply = KAREN_REPLIES[Math.floor(Math.random() * KAREN_REPLIES.length)]
    const karenComment = new Comment({
      text: randomReply,
      message: req.params.id,
      parentComment: saved._id,
    })
    await karenComment.save()

    res.status(201).json(populated)
  } catch (error) {
    console.error("Comment error:", error)
    res.status(400).json({ error: "Could not save comment" })
  }
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})