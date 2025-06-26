import mongoose from "mongoose";

const threadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    views: {
      type: Number,
      default: 0,
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
threadSchema.index({ title: "text", content: "text" });
threadSchema.index({ author: 1, createdAt: -1 });
threadSchema.index({ tags: 1 });

const Thread = mongoose.model("Thread", threadSchema);

export default Thread;
