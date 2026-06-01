import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({

  // [KRAV K2] Strikt indatavalidering (STRIDE: Tampering / OWASP A05: Injection)
  //
  // FÖRE: { type: String, required: true }
  //   - Ingen min- eller maxlängd → tomma strängar och enorma meddelanden godkändes
  //   - Ingen trim → whitespace-meddelanden ("   ") passerade required-kontrollen
  //
  // EFTER: minlength: 3, maxlength: 140, trim: true
  //   - trim tar bort whitespace före/efter → "   " blir "" → failar required
  //   - minlength 3 förhindrar meningslösa meddelanden
  //   - maxlength 140 skyddar mot databasöverbelastning
  //   - Valideringen sker i Mongoose (backend) — vi litar ALDRIG på frontend

  message: {
    type: String,
    required: [true, "Message is required"],
    minlength: [3, "Message must be at least 3 characters"],
    maxlength: [140, "Message cannot exceed 140 characters"],
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Message = mongoose.model("Message", messageSchema)