import express from "express";
import { Notification } from "../models/notification.js";

const router = express.Router();

// GET ALL NOTIFICATIONS FOR A USER
router.get("/notifications/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.params.userId })
      .populate("sender", "name username profilePic")
      .populate("post", "imageUrl")
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MARK ALL AS READ
router.put("/notifications/read/:userId", async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.params.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET UNREAD COUNT
router.get("/notifications/unread/:userId", async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.params.userId, isRead: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
