import express from "express";
import { Post } from "../models/post.js";
import { Notification } from "../models/notification.js";

const router = express.Router();

// CREATE POST
router.post("/post", async (req, res) => {
  try {
    const { user, caption, image } = req.body;
    if (!user || !caption) return res.status(400).json({ message: "User and caption are required" });

    const post = new Post({ user, caption, image });
    const saved = await post.save();
    const populated = await saved.populate("user", "-password");
    
    // Broadcast new post to all connected users
    if (req.io) {
      req.io.emit("new_post", populated);
    }
    
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE POST
router.delete("/post/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Ensure the user deleting the post is the owner.
    // The user ID should be passed in the query or header. Using query for simplicity here.
    if (req.query.userId && post.user.toString() !== req.query.userId) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(req.params.id);
    
    // Also clean up notifications related to this post
    await Notification.deleteMany({ post: req.params.id });
    
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET POSTS BY USER
router.get("/posts/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate("user", "-password")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET ALL POSTS (feed)
router.get("/posts/feed", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "-password")
      .populate("comments.user", "name username profilePic")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// TOGGLE LIKE
router.put("/post/:id/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const index = post.likes.findIndex(id => id.toString() === userId);
    let isLiked = false;
    if (index === -1) {
      post.likes.push(userId);
      isLiked = true;
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();

    // Create and send notification if it's a new like and not the owner
    if (isLiked && post.user.toString() !== userId) {
      const notification = new Notification({
        recipient: post.user,
        sender: userId,
        type: 'like',
        post: post._id
      });
      await notification.save();
      const populatedNotif = await notification.populate("sender", "name username profilePic");
      if (req.connectedUsers && req.io) {
        const targetSocketId = req.connectedUsers.get(post.user.toString());
        if (targetSocketId) {
          req.io.to(targetSocketId).emit("new_notification", populatedNotif);
        }
      }
    }

    res.json({ likes: post.likes.length, liked: isLiked, likesArray: post.likes.map(id => id.toString()) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD COMMENT
router.post("/post/:id/comment", async (req, res) => {
  try {
    const { userId, text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ user: userId, text });
    await post.save();
    
    // Create notification for comment
    if (post.user.toString() !== userId) {
      const notification = new Notification({
        recipient: post.user,
        sender: userId,
        type: 'comment',
        post: post._id,
        text: text
      });
      await notification.save();
      const populatedNotif = await notification.populate("sender", "name username profilePic");
      if (req.connectedUsers && req.io) {
        const targetSocketId = req.connectedUsers.get(post.user.toString());
        if (targetSocketId) {
          req.io.to(targetSocketId).emit("new_notification", populatedNotif);
        }
      }
    }
    
    // Return the newly populated comments array
    const populatedPost = await Post.findById(post._id).populate("comments.user", "name username profilePic");
    res.json(populatedPost.comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
