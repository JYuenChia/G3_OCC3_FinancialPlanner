const { User } = require("../db");

async function findByEmail(email) {
  return User.findOne({ email: email.toLowerCase() }).lean();
}

async function findById(id) {
  return User.findById(id).lean();
}

async function createUser(user) {
  return User.create(user);
}

async function updateProfile(id, email, fullName) {
  return User.findByIdAndUpdate(
    id,
    {
      email: email.toLowerCase(),
      full_name: fullName || null,
    },
    { new: true }
  ).lean();
}

async function updatePassword(id, passwordHash) {
  return User.findByIdAndUpdate(
    id,
    { password_hash: passwordHash },
    { new: true }
  ).lean();
}

async function deleteUser(id) {
  const result = await User.findByIdAndDelete(id);
  return result ? { deletedCount: 1 } : { deletedCount: 0 };
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  updateProfile,
  updatePassword,
  deleteUser,
};
