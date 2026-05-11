const { verifyAccessToken } = require("../utils/auth.util");
const { isTokenRevoked } = require("../repositories/revoked-token.repository");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyAccessToken(token);

    if (!payload || payload.type !== "access" || !payload.sub || !payload.jti) {
      return res.status(401).json({ error: "Invalid access token" });
    }

    const revoked = await isTokenRevoked(payload.jti);

    if (revoked) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    req.auth = {
      userId: payload.sub,
      role: payload.role === "admin" ? "admin" : "user",
      tokenId: payload.jti,
      tokenExpiresAt: payload.exp,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
