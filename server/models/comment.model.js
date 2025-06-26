import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
commentSchema.index({ thread: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
