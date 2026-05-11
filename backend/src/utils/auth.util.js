const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

const accessSecret = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

function signAccessToken(userId, role = "user") {
  return jwt.sign({ sub: userId, type: "access", role, jti: uuidv4() }, accessSecret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: "refresh", jti: uuidv4() }, refreshSecret, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}


module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
