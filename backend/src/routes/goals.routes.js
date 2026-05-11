const express = require("express");
const { v4: uuidv4 } = require("uuid");


const { requireAuth } = require("../middleware/auth.middleware");
const { findById: findUserById } = require("../repositories/user.repository");
const {
  createGoal,
  deleteGoal,
  findById: findGoalById,
  listGoals,
  updateGoal,
} = require("../repositories/goals.repository");
const {
  goalCreateSchema,
  goalUpdateSchema,
} = require("../schemas/goal.schema");


const router = express.Router();


// Helper to convert to public goal format
function toPublicGoal(goal) {
  if (!goal) return null;


  return {
    id: goal._id,
    user_id: goal.user_id,
    title: goal.title,
    target_amount: goal.target_amount,
    current_amount: goal.current_amount,
    target_date:
      goal.target_date instanceof Date
        ? goal.target_date.toISOString()
        : goal.target_date,
    priority: goal.priority,
    risk_appetite: goal.risk_appetite,
    created_at: goal.created_at,
    updated_at: goal.updated_at,
  };
}


// Helper to check access
function canAccessGoal(auth, goal) {
  return auth.role === "admin" || goal.user_id === auth.userId;
}


// Helper to find and verify goal access
async function getAccessibleGoal(req, res, goalId) {
  const goal = await findGoalById(goalId);


  if (!goal) {
    res.status(404).json({ success: false, message: "Goal not found" });
    return null;
  }


  if (!canAccessGoal(req.auth, goal)) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return null;
  }


  return goal;
}


// Apply auth middleware to all goal routes
router.use(requireAuth);


// GET /api/goals -> fetch all goals belonging to logged-in user
router.get("/", async (req, res) => {
  try {
    const goals =
      req.auth.role === "admin"
        ? await listGoals()
        : await listGoals({ userId: req.auth.userId });


    return res.status(200).json({
      success: true,
      data: goals.map(toPublicGoal)
    });
  } catch (error) {
    console.error("List goals error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// POST /api/goals -> create new goal
router.post("/", async (req, res) => {
  try {
    const parsed = goalCreateSchema.safeParse(req.body);


    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.errors.map(err => err.message)
      });
    }


    const goal = await createGoal({
      _id: uuidv4(),
      user_id: req.auth.userId,
      ...parsed.data
    });


    return res.status(201).json({
      success: true,
      message: "Goal created successfully",
      data: toPublicGoal(goal)
    });
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// GET /api/goals/:id -> fetch specific goal
router.get("/:id", async (req, res) => {
  try {
    const goal = await getAccessibleGoal(req, res, req.params.id);


    if (!goal) return;


    return res.status(200).json({
      success: true,
      data: toPublicGoal(goal)
    });
  } catch (error) {
    console.error("Get goal error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// PUT /api/goals/:id -> update goal by ID
router.put("/:id", async (req, res) => {
  try {
    const goal = await getAccessibleGoal(req, res, req.params.id);
    if (!goal) return;


    const parsed = goalUpdateSchema.safeParse(req.body);


    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.errors.map(err => err.message)
      });
    }


    const updated = await updateGoal(goal._id, parsed.data);


    return res.status(200).json({
      success: true,
      message: "Goal updated successfully",
      data: toPublicGoal(updated)
    });
  } catch (error) {
    console.error("Update goal error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// DELETE /api/goals/:id -> delete goal by ID
router.delete("/:id", async (req, res) => {
  try {
    const goal = await getAccessibleGoal(req, res, req.params.id);
    if (!goal) return;


    const result = await deleteGoal(goal._id);


    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: "Goal not found" });
    }


    return res.status(200).json({
      success: true,
      message: "Goal deleted successfully"
    });
  } catch (error) {
    console.error("Delete goal error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


module.exports = router;


