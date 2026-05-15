import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ['like', 'comment', 'friend_request', 'friend_accept'], required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  text: { type: String }, // For comment text or extra info
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema);
