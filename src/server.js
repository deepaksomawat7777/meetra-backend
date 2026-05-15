import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import userRoutes from "./routes/userRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ========================
// Allowed Origins
// ========================
const allowedOrigins = [
  "http://localhost:4200",
  "https://meetra-00.web.app"
];

// ========================
// CORS CONFIG (FINAL FIX)
// ========================
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, postman)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// ⚠️ DO NOT use app.options("*") in Express 5
// So we are NOT adding wildcard preflight handler

// ========================
// Socket.io Setup
// ========================
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// ========================
// Connected Users Map
// ========================
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

// ========================
// Inject io into routes
// ========================
app.use((req, res, next) => {
  req.io = io;
  req.connectedUsers = connectedUsers;
  next();
});

// ========================
// Middleware
// ========================
app.use(express.json({ limit: "5mb" }));

// ========================
// Routes
// ========================
app.use("/api", userRoutes);
app.use("/api", friendRoutes);
app.use("/api", messageRoutes);
app.use("/api", postRoutes);
app.use("/api", notificationRoutes);

// ========================
// MongoDB
// ========================
mongoose.connect(process.env.MONGO_URI, { dbName: "meetra" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

// ========================
// Test Route
// ========================
app.get("/", (req, res) => {
  res.send("Meetra API is working ✅");
});

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});