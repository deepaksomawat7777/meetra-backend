import express from "express";
import mongoose from "mongoose";
import { Message } from "../models/message.js";

const router = express.Router();

// SEND MESSAGE
router.post("/message", async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;
    if (!sender || !receiver || !content) return res.status(400).json({ message: "All fields required" });

    const msg = new Message({ sender, receiver, content });
    await msg.save();
    
    // Socket emission to receiver
    if (req.connectedUsers && req.io) {
      const targetSocketId = req.connectedUsers.get(receiver.toString());
      if (targetSocketId) {
        req.io.to(targetSocketId).emit("new_message", msg);
      }
    }
    
    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET CONVERSATION BETWEEN TWO USERS
router.get("/messages/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET UNREAD COUNTS PER SENDER
router.get("/messages/unread/:userId", async (req, res) => {
  try {
    const unread = await Message.aggregate([
      { $match: { receiver: new mongoose.Types.ObjectId(req.params.userId), isRead: false } },
      { $group: { _id: "$sender", count: { $sum: 1 } } }
    ]);
    res.json(unread);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MARK MESSAGES AS READ
router.put("/messages/read/:senderId/:receiverId", async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.senderId, receiver: req.params.receiverId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
