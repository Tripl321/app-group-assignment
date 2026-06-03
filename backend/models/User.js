import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 2,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  
  // [KRAV K1] Lösenordslös inloggning — framtida ändring
  
  // NULÄGE: password-fältet lagrar en bcrypt-hash av användarens lösenord.
  // bcrypt med salt rounds 10 är en bra implementation, men lösenord i sig är sårbara för phishing och brute force.
  
  // FRAMTIDA IMPLEMENTATION (Passkeys/WebAuthn):
  // - Lägg till fält: passkeyCredentialId (String) och passkeyPublicKey (Buffer)
  // - Gör password-fältet valfritt (required: false) för Passkey-användare
  // - Passkeys binder autentisering kryptografiskt till domänen
  
  password: {
    type: String,
    required: true,
  },
})

export const User = mongoose.model("User", userSchema)