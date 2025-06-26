import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      return this.role !== "guest"; // Password not required for guests
    },
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  role: {
    type: String,
    enum: ["community_member", "moderator", "admin", "guest"],
    default: "guest",
  },
  permissions: {
    canPost: {
      type: Boolean,
      default: function () {
        return ["community_member", "moderator", "admin"].includes(this.role);
      },
    },
    canComment: {
      type: Boolean,
      default: function () {
        return ["community_member", "moderator", "admin"].includes(this.role);
      },
    },
    canModerate: {
      type: Boolean,
      default: function () {
        return ["moderator", "admin"].includes(this.role);
      },
    },
    canManageUsers: {
      type: Boolean,
      default: function () {
        return this.role === "admin";
      },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
});

// Update lastActive timestamp on each save
userSchema.pre("save", function (next) {
  this.lastActive = new Date();
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
