import mongoose from "mongoose"

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, "Comment is required"],
    maxlength: [280, "Comment cannot exceed 280 characters"],
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    required: true,
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Comment = mongoose.model("Comment", commentSchema)
