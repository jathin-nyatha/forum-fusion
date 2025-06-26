import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import { Todo } from "./models/todo.model.js";
import User from "./models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import auth from "./middleware/auth.js";
import authorize from "./middleware/authorize.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import Thread from "./models/thread.model.js";
import Comment from "./models/comment.model.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

console.log("JWT_SECRET:", process.env.JWT_SECRET);

// Middleware
app.use(express.json());
app.use(cors());

// Configure Nodemailer (ensure these env variables are set in your .env file)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // e.g., 'Gmail'
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();

    // Example of a route accessible only by admins
    app.get("/admin-dashboard", auth, authorize(["admin"]), (req, res) => {
      res.send({
        success: true,
        message: "Welcome to the Admin Dashboard!",
        user: req.user,
      });
    });

    // Example of a protected route (requires authentication)
    app.get("/protected-route", auth, (req, res) => {
      res.send({
        success: true,
        message: "You accessed a protected route!",
        user: req.user,
      });
    });

    app.get("/todos", async (req, res) => {
      try {
        const result = await Todo.find();
        res.send({
          success: true,
          message: "Todos fetched successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Error fetching todos",
          error: error.message,
        });
      }
    });

    app.post("/signup", async (req, res) => {
      try {
        const { username, email, password } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user with default role
        const newUser = await User.create({
          username,
          email,
          password: hashedPassword,
          role: "community_member", // Default role
        });

        res.status(201).send({
          success: true,
          message: "User registered successfully",
          data: newUser,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Error registering user",
          error: error.message,
        });
      }
    });

    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(400).send({
            success: false,
            message: "Invalid credentials",
          });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).send({
            success: false,
            message: "Invalid credentials",
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user._id, role: user.role },
          process.env.JWT_SECRET,
          {
            expiresIn: "1h",
          }
        );

        res.status(200).send({
          success: true,
          message: "Logged in successfully",
          token,
          role: user.role,
          username: user.username,
          email: user.email,
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).send({
          success: false,
          message: "Error logging in",
          error: error.message,
        });
      }
    });

    // Password reset request route
    app.post("/forgot-password", async (req, res) => {
      try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User with that email does not exist.",
          });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const passwordResetToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");
        const passwordResetExpires = Date.now() + 3600000; // 1 hour

        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpires = passwordResetExpires;
        await user.save();

        // Send email
        const resetURL = `${req.protocol}://${req.get(
          "host"
        )}/reset-password/${resetToken}`;

        const mailOptions = {
          to: user.email,
          from: process.env.EMAIL_USERNAME,
          subject: "Password Reset Request",
          html: `
            <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
            <p>Please click on the following link, or paste this into your browser to complete the process:</p>
            <p><a href="${resetURL}">${resetURL}</a></p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          `,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).send({
          success: true,
          message: "Password reset email sent successfully.",
        });
      } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).send({
          success: false,
          message: "Error sending password reset email.",
          error: error.message,
        });
      }
    });

    // Reset password route
    app.put("/reset-password/:token", async (req, res) => {
      try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        const user = await User.findOne({
          passwordResetToken: hashedToken,
          passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
          return res.status(400).send({
            success: false,
            message: "Password reset token is invalid or has expired.",
          });
        }

        // Set new password
        user.password = await bcrypt.hash(password, 10);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).send({
          success: true,
          message: "Password has been reset successfully.",
        });
      } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).send({
          success: false,
          message: "Error resetting password.",
          error: error.message,
        });
      }
    });

    app.post("/create-todo", async (req, res) => {
      const todoDetails = req.body;
      try {
        const result = await Todo.create(todoDetails);
        res.send({
          success: true,
          message: "Todo created successfully",
          data: result,
        });
      } catch (error) {
        res.send({
          success: false,
          message: "Error creating todo",
          data: result,
        });
      }
    });

    // Guest routes (no authentication required)
    app.get("/public/threads", async (req, res) => {
      try {
        const threads = await Thread.find({ isPublic: true })
          .populate("author", "username")
          .sort({ createdAt: -1 });
        res.json({ success: true, data: threads });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Community Member routes
    app.post(
      "/threads",
      auth,
      authorize({ permissions: ["canPost"] }),
      async (req, res) => {
        try {
          const thread = await Thread.create({
            ...req.body,
            author: req.user.userId,
          });
          res.status(201).json({ success: true, data: thread });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    );

    app.post(
      "/threads/:threadId/comments",
      auth,
      authorize({ permissions: ["canComment"] }),
      async (req, res) => {
        try {
          const comment = await Comment.create({
            ...req.body,
            author: req.user.userId,
            thread: req.params.threadId,
          });
          res.status(201).json({ success: true, data: comment });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    );

    // Moderator routes
    app.put(
      "/threads/:threadId/moderate",
      auth,
      authorize({ permissions: ["canModerate"] }),
      async (req, res) => {
        try {
          const thread = await Thread.findByIdAndUpdate(
            req.params.threadId,
            { $set: req.body },
            { new: true }
          );
          res.json({ success: true, data: thread });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    );

    app.delete(
      "/comments/:commentId",
      auth,
      authorize({ permissions: ["canModerate"] }),
      async (req, res) => {
        try {
          await Comment.findByIdAndDelete(req.params.commentId);
          res.json({ success: true, message: "Comment deleted successfully" });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    );

    // Admin routes
    app.get(
      "/admin/users",
      auth,
      authorize({ permissions: ["canManageUsers"] }),
      async (req, res) => {
        try {
          const users = await User.find().select("-password");
          res.json({ success: true, data: users });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    );

    app.put(
      "/admin/users/:userId/role",
      auth,
      authorize({ permissions: ["canManageUsers"] }),
      async (req, res) => {
        try {
          const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { role: req.body.role } },
            { new: true }
          ).select("-password");
          res.json({ success: true, data: user });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    );

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
