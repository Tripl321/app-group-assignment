import mongoose from "mongoose"
 
// [KRAV K4] Skyddade hemligheter (STRIDE: Information Disclosure)
// OWASP A02: Security Misconfiguration
//
// FÖRE: const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/messages"
//   - Om MONGO_URL saknades i .env anslöt servern tyst till en lokal databas
//     utan autentisering — farligt om det sker i produktion av misstag.
//
// EFTER: Servern kraschar omedelbart om MONGO_URL saknas.
//   - MONGO_URL innehåller ofta användarnamn och lösenord för databasen
//   - Den ska ALDRIG hårdkodas i koden utan hanteras via .env
//   - .env ligger i .gitignore och checkas aldrig in i Git

if (!process.env.MONGO_URL) throw new Error("MONGO_URL is not set in .env")
const mongoUrl = process.env.MONGO_URL
 
mongoose.connect(mongoUrl)
 
mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB")
})
 
mongoose.connection.on("error", err => {
  console.error("connection error:", err)
})
 