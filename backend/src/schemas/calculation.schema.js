const { z } = require("zod");
const mongoose = require("mongoose");

const calculationSchema = new mongoose.Schema(
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
    initial: {
      type: Number,
      required: true,
      min: 0.01,
    },
    rate_percent: {
      type: Number,
      required: true,
      min: 0,
    },
    years: {
      type: Number,
      required: true,
      min: 0.01,
    },
    final_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    profit: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const calculationCreateSchema = z.object({
  user_id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  initial: z.coerce.number().finite().positive(),
  rate_percent: z.coerce.number().finite().min(0),
  years: z.coerce.number().finite().positive(),
  final_amount: z.coerce.number().finite().min(0),
  profit: z.coerce.number().finite().min(0),
});

module.exports = {
  calculationSchema,
  calculationCreateSchema,
};
