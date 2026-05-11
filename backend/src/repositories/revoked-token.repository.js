const { RevokedToken } = require("../db");

async function revokeToken({ jti, type, userId, expiresAt }) {
  return RevokedToken.findByIdAndUpdate(
    jti,
    {
      _id: jti,
      type,
      user_id: userId,
      expires_at: expiresAt,
      revoked_at: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

async function isTokenRevoked(jti) {
  if (!jti) {
    return false;
  }

  const revoked = await RevokedToken.findById(jti).select({ _id: 1 }).lean();
  return Boolean(revoked);
}

module.exports = {
  revokeToken,
  isTokenRevoked,
};
