const { Calculation } = require("../db");

async function findById(id) {
  return Calculation.findById(id).lean();
}

async function listCalculations(filter = {}) {
  const query = {};

  if (filter.userId) {
    query.user_id = filter.userId;
  }

  return Calculation.find(query).sort({ created_at: -1 }).lean();
}

async function createCalculation(calculation) {
  return Calculation.create(calculation);
}

async function deleteCalculation(id) {
  const result = await Calculation.findByIdAndDelete(id);
  return result ? { deletedCount: 1 } : { deletedCount: 0 };
}

async function deleteAllCalculations(userId) {
  const result = await Calculation.deleteMany({ user_id: userId });
  return result;
}

module.exports = {
  findById,
  listCalculations,
  createCalculation,
  deleteCalculation,
  deleteAllCalculations,
};
