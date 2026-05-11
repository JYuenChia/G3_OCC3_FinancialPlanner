const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const validator = require("validator");

const {
  createUser,
  findByEmail,
  findById,
} = require("../repositories/user.repository");
const {
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require("../schemas/auth.schema");
const {
  isTokenRevoked,
  revokeToken,
} = require("../repositories/revoked-token.repository");
const { requireAuth } = require("../middleware/auth.middleware");
const { registerSchema } = require("../schemas/user.schema");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/auth.util");

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

router.post("/auth/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid registration payload" });
    }

    const { email, password, full_name } = parsed.data;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await createUser({
      _id: uuidv4(),
      email,
      password_hash,
      full_name: full_name || null,
    });

    const publicUser = toPublicUser(user);

    return res.status(201).json({
      user: publicUser,
      access_token: signAccessToken(publicUser.id, publicUser.role),
      refresh_token: signRefreshToken(publicUser.id),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid login payload" });
    }
    const { email, password } = parsed.data;
    const user = await findByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const publicUser = toPublicUser(user);

    return res.status(200).json({
      user: publicUser,
      access_token: signAccessToken(publicUser.id, publicUser.role),
      refresh_token: signRefreshToken(publicUser.id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  const parsed = logoutSchema.safeParse(req.body || {});

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid logout payload" });
  }

  try {
    let refreshPayload = null;

    if (parsed.data.refresh_token) {
      refreshPayload = verifyRefreshToken(parsed.data.refresh_token);

      if (
        !refreshPayload ||
        refreshPayload.type !== "refresh" ||
        !refreshPayload.sub ||
        !refreshPayload.jti ||
        refreshPayload.sub !== req.auth.userId
      ) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }
    }

    await revokeToken({
      jti: req.auth.tokenId,
      type: "access",
      userId: req.auth.userId,
      expiresAt: new Date(req.auth.tokenExpiresAt * 1000),
    });

    if (refreshPayload) {
      await revokeToken({
        jti: refreshPayload.jti,
        type: "refresh",
        userId: refreshPayload.sub,
        expiresAt: new Date(refreshPayload.exp * 1000),
      });
    }

    return res.status(200).json({ status: "logged_out" });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

router.post("/auth/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid refresh payload" });
  }

  try {
    const payload = verifyRefreshToken(parsed.data.refresh_token);

    if (!payload || payload.type !== "refresh" || !payload.sub || !payload.jti) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const revoked = await isTokenRevoked(payload.jti);

    if (revoked) {
      return res.status(401).json({ error: "Refresh token has been revoked" });
    }

    const user = await findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    return res.status(200).json({
      access_token: signAccessToken(user._id, user.role || "user"),
    });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

module.exports = router;
