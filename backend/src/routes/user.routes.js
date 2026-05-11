const express = require("express");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const { requireAuth } = require("../middleware/auth.middleware");
const {
  findByEmail,
  findById,
  updatePassword,
  updateProfile,
  deleteUser,
} = require("../repositories/user.repository");
const {
  updatePasswordSchema,
  updateProfileSchema,
} = require("../schemas/user.schema");

const router = express.Router();

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    full_name: user.full_name,
    role: user.role || "user",
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

router.get("/user/profile", requireAuth, async (req, res) => {
  try {
    const user = await findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/user/profile", requireAuth, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid profile payload" });
    }

    const current = await findById(req.auth.userId);
    if (!current) {
      return res.status(404).json({ error: "User not found" });
    }

    const nextEmail = parsed.data.email || current.email;
    const nextFullName = parsed.data.full_name ?? current.full_name;

    if (!validator.isEmail(nextEmail)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const existing = await findByEmail(nextEmail);
    if (existing && existing._id !== current._id) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const updated = await updateProfile(current._id, nextEmail, nextFullName);
    return res.status(200).json({ user: toPublicUser(updated) });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/user/password", requireAuth, async (req, res) => {
  try {
    const parsed = updatePasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid password payload" });
    }

    const user = await findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isCurrentValid = await bcrypt.compare(
      parsed.data.current_password,
      user.password_hash
    );

    if (!isCurrentValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const nextPasswordHash = await bcrypt.hash(parsed.data.new_password, 12);
    await updatePassword(user._id, nextPasswordHash);

    return res.status(200).json({ status: "password_updated" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/user/account", requireAuth, async (req, res) => {
  try {
    const result = await deleteUser(req.auth.userId);

    if (!result.deletedCount) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ status: "account_deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
