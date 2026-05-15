import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/user.js";

const router = express.Router();

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    res.json({
      message: "Login successful",
      user: { _id: user._id, name: user.name, username: user.username, number: user.number, email: user.email, bio: user.bio, profilePic: user.profilePic }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SIGNUP
router.post("/user", async (req, res) => {
  try {
    const { name, username, email, number, password } = req.body;
    if (!name || !username || !email || !password) return res.status(400).json({ message: "Name, username, email and password are required" });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(409).json({ message: "Email already registered" });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(409).json({ message: "Username already taken" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, username, email, number, password: hashedPassword });
    const saved = await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SEARCH USERS BY USERNAME
router.get("/search-users", async (req, res) => {
  try {
    const { q, currentUserId } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: q, $options: "i" }
    }).select("-password").limit(20);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET ALL USERS (exclude current)
router.get("/users/:currentUserId", async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.currentUserId } }).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET USER BY ID
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE PROFILE (name, bio, profilePic only)
router.put("/user/:id/profile", async (req, res) => {
  try {
    const { name, bio, profilePic } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePic !== undefined) updateData.profilePic = profilePic;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user: { _id: user._id, name: user.name, username: user.username, number: user.number, email: user.email, bio: user.bio, profilePic: user.profilePic } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;