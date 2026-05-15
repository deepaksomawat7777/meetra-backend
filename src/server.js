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

// 🔥 Allowed origins
const allowedOrigins = [
  "http://localhost:4200",
  "https://meetra-00.web.app"
];

// 🔥 CORS FIX (IMPORTANT FOR RENDER + BROWSER PRE-FLIGHT)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin); // return origin explicitly
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false   // ⚠️ keep false since you are NOT using cookies
}));

// 🔥 handle preflight requests
app.options("*", cors());

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// connected users map
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

// inject io
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

// MongoDB
mongoose.connect(process.env.MONGO_URI, { dbName: "meetra" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

// test route
app.get("/", (req, res) => {
  res.send("Meetra API is working ✅");
});

// start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});