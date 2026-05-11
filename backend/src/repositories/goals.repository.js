const { Goal } = require("../db");

async function findById(id) {
  return Goal.findById(id).lean();
}

async function listGoals(filter = {}) {
  const query = {};

  if (filter.userId) {
    query.user_id = filter.userId;
  }

  return Goal.find(query).sort({ target_date: 1, created_at: -1 }).lean();
}

async function createGoal(goal) {
  return Goal.create(goal);
}

async function updateGoal(id, updates) {
  return Goal.findByIdAndUpdate(id, updates, { new: true }).lean();
}

async function deleteGoal(id) {
  const result = await Goal.findByIdAndDelete(id);
  return result ? { deletedCount: 1 } : { deletedCount: 0 };
}

module.exports = {
  findById,
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};