const express = require("express");
const router = express.Router();
const Comment = require("../models/comment.model");
const Thread = require("../models/thread.model");
const auth = require("../middleware/auth");

// Get comments for a thread
router.get("/thread/:threadId", async (req, res) => {
  try {
    const { threadId } = req.params;
    const { parentId } = req.query;

    const query = { thread: threadId };
    if (parentId) {
      query.parent = parentId;
    } else {
      query.parent = null; // Get only top-level comments
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: 1 })
      .populate("author", "username avatar")
      .lean();

    // Get reply counts for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replyCount = await Comment.countDocuments({
          parent: comment._id,
        });
        return { ...comment, replyCount };
      })
    );

    res.json(commentsWithReplies);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Error fetching comments" });
  }
});

// Create a new comment
router.post("/", auth, async (req, res) => {
  try {
    const { content, threadId, parentId } = req.body;

    // Verify thread exists
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // If parentId is provided, verify parent comment exists
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
    }

    const comment = new Comment({
      content,
      author: req.user._id,
      thread: threadId,
      parent: parentId || null,
    });

    await comment.save();
    await comment.populate("author", "username avatar");

    // Update thread's comment count
    await Thread.findByIdAndUpdate(threadId, { $inc: { commentCount: 1 } });

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ message: "Error creating comment" });
  }
});

// Update a comment
router.put("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (
      comment.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this comment" });
    }

    comment.content = req.body.content;
    comment.isEdited = true;
    await comment.save();
    await comment.populate("author", "username avatar");

    res.json(comment);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ message: "Error updating comment" });
  }
});

// Delete a comment
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (
      comment.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }

    // Delete all replies first
    await Comment.deleteMany({ parent: comment._id });

    // Delete the comment
    await comment.remove();

    // Update thread's comment count
    await Thread.findByIdAndUpdate(comment.thread, {
      $inc: { commentCount: -1 },
    });

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Error deleting comment" });
  }
});

// Like/Unlike a comment
router.post("/:id/like", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    comment.likes += 1;
    await comment.save();

    res.json({ likes: comment.likes });
  } catch (error) {
    console.error("Error liking comment:", error);
    res.status(500).json({ message: "Error liking comment" });
  }
});

module.exports = router;
