import express from "express";
import { FriendRequest } from "../models/friendRequest.js";

const router = express.Router();

// SEND FRIEND REQUEST
router.post("/friend-request", async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ message: "from and to are required" });
    if (from === to) return res.status(400).json({ message: "Cannot send request to yourself" });

    const existing = await FriendRequest.findOne({
      $or: [
        { from, to, status: { $in: ["pending", "accepted"] } },
        { from: to, to: from, status: { $in: ["pending", "accepted"] } }
      ]
    });
    if (existing) return res.status(409).json({ message: "Request already exists" });

    const request = new FriendRequest({ from, to });
    await request.save();
    if (req.connectedUsers && req.io) {
      const targetSocketId = req.connectedUsers.get(to.toString());
      if (targetSocketId) {
        req.io.to(targetSocketId).emit("new_friend_request");
      }
    }
    res.status(201).json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET RECEIVED REQUESTS (pending)
router.get("/friend-requests/received/:userId", async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.params.userId, status: "pending" }).populate("from", "-password");
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET SENT REQUESTS (pending)
router.get("/friend-requests/sent/:userId", async (req, res) => {
  try {
    const requests = await FriendRequest.find({ from: req.params.userId, status: "pending" }).populate("to", "-password");
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ACCEPT REQUEST
router.put("/friend-request/:id/accept", async (req, res) => {
  try {
    const request = await FriendRequest.findByIdAndUpdate(req.params.id, { status: "accepted" }, { new: true });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (req.connectedUsers && req.io) {
      const targetSocketId = req.connectedUsers.get(request.from.toString());
      if (targetSocketId) {
        req.io.to(targetSocketId).emit("friend_request_accepted");
      }
    }
    res.json({ message: "Request accepted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// REJECT REQUEST
router.put("/friend-request/:id/reject", async (req, res) => {
  try {
    await FriendRequest.findByIdAndDelete(req.params.id);
    res.json({ message: "Request rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET FRIENDS LIST
router.get("/friends/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const accepted = await FriendRequest.find({ status: "accepted", $or: [{ from: userId }, { to: userId }] })
      .populate("from", "-password")
      .populate("to", "-password");

    const friends = accepted.map(r => {
      return r.from._id.toString() === userId ? r.to : r.from;
    });
    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
