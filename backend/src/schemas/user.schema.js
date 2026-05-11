const { z } = require("zod");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    full_name: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(1).max(100).optional(),
});

const updateProfileSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  full_name: z.string().trim().min(1).max(100).optional(),
});

const updatePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z.string().min(8).max(128),
});

module.exports = {
  userSchema,
  registerSchema,
  updateProfileSchema,
  updatePasswordSchema,
};