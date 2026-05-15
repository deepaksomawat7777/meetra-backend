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

// ✅ Allowed origins define karo
const allowedOrigins = [
  "http://localhost:4200",
  "https://meetra-00.web.app"
];

// ✅ CORS middleware (sirf ek baar)
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ✅ Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Map to track active users
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log("User registered:", userId, "->", socket.id);
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

// Inject io into routes
app.use((req, res, next) => {
  req.io = io;
  req.connectedUsers = connectedUsers;
  next();
});

// middleware
app.use(express.json({ limit: "5mb" }));

// routes
app.use("/api", userRoutes);
app.use("/api", friendRoutes);
app.use("/api", messageRoutes);
app.use("/api", postRoutes);
app.use("/api", notificationRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { dbName: "meetra" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

// test route
app.get("/", (req, res) => {
  res.send("Meetra API is working ✅");
});

// server start
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});