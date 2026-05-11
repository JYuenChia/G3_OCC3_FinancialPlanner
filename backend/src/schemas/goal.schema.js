const { z } = require("zod");
const mongoose = require("mongoose");


const goalSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    target_amount: {
      type: Number,
      required: true,
      min: [0.01, "Target amount must be positive"],
    },
    current_amount: {
      type: Number,
      required: true,
      min: [0, "Current amount cannot be negative"],
      default: 0,
    },
    target_date: {
      type: Date,
      required: true,
    },
    risk_appetite: {
      type: Number,
      required: true,
      min: [1, "Risk appetite must be at least 1"],
      max: [5, "Risk appetite cannot exceed 5"],
      default: 3
    },
    priority: {
      type: String,
      enum: ["Critical", "Need", "Want"],
      default: "Need"
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);


const goalCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  target_amount: z.coerce.number().finite().positive("Target amount must be positive"),
  current_amount: z.coerce.number().finite().min(0, "Current amount cannot be negative").default(0),
  target_date: z.coerce.date(),
  risk_appetite: z.coerce.number().int().min(1).max(5).default(3),
  priority: z.enum(["Critical", "Need", "Want"]).optional()
});


const goalUpdateSchema = goalCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });


module.exports = {
  goalSchema,
  goalCreateSchema,
  goalUpdateSchema,
};
