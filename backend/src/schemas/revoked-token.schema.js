const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["access", "refresh"],
      required: true,
    },
    user_id: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    revoked_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = {
  revokedTokenSchema,
};
