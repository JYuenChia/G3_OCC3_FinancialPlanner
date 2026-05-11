require("dotenv").config();
const mongoose = require("mongoose");
const { userSchema } = require("./schemas/user.schema");
const { goalSchema } = require("./schemas/goal.schema");
const { revokedTokenSchema } = require("./schemas/revoked-token.schema");
const { calculationSchema } = require("./schemas/calculation.schema");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || MONGODB_URI === "") {
  console.error(
    "MONGODB_URI environment variable not set. Please check your .env file."
  );
  process.exit(1);
}

const User = mongoose.model("User", userSchema);
const Goal = mongoose.model("Goal", goalSchema);
const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);
const Calculation = mongoose.model("Calculation", calculationSchema);

async function connectDB() {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  User,
  Goal,
  RevokedToken,
  Calculation,
  mongoose,
};
