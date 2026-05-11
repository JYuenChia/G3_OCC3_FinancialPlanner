const express = require("express");
const { findById, listGoals } = require("../repositories/goals.repository");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Helper function to calculate investment strategy based on risk appetite and timeline
function generateStrategy(goal) {
  const today = new Date();
  const yearsUntilTarget =
    (goal.target_date - today) / (1000 * 60 * 60 * 24 * 365);
  const amountNeeded = goal.target_amount - goal.current_amount;
  const monthlyContribution = amountNeeded / (yearsUntilTarget * 12);

  if (yearsUntilTarget <= 0) {
    throw new Error("Invalid target date: Target date must be in the future.");
  }

  const strategies = {
    aggressive: {
      name: "Aggressive Growth",
      allocation: { stocks: 90, bonds: 10 },
      expectedAnnualReturn: 0.1,
      description:
        "High growth potential with higher volatility. Best for long-term goals.",
    },
    balanced: {
      name: "Balanced Growth",
      allocation: { stocks: 60, bonds: 40 },
      expectedAnnualReturn: 0.07,
      description:
        "Moderate growth with balanced risk. Suitable for medium-term goals.",
    },
    conservative: {
      name: "Conservative Income",
      allocation: { stocks: 30, bonds: 70 },
      expectedAnnualReturn: 0.04,
      description: "Lower risk with steady income. Best for short-term goals.",
    },
  };

  // Select strategy based on risk appetite and timeline
  let selectedStrategy;
  if (goal.risk_appetite >= 4 && yearsUntilTarget > 5) {
    selectedStrategy = "aggressive";
  } else if (goal.risk_appetite >= 3 || yearsUntilTarget > 2) {
    selectedStrategy = "balanced";
  } else {
    selectedStrategy = "conservative";
  }

  const strategy = strategies[selectedStrategy];
  const projectedValue =
    goal.current_amount +
    monthlyContribution *
      12 *
      yearsUntilTarget *
      (1 + strategy.expectedAnnualReturn / 2);

  // Calculate yearly growth data for the graph
  const growthData = { years: [], values: [] };
  let currentValue = goal.current_amount;
  for (let year = 1; year <= Math.ceil(yearsUntilTarget); year++) {
    currentValue += monthlyContribution * 12;
    currentValue *= 1 + strategy.expectedAnnualReturn;
    growthData.years.push(today.getFullYear() + year);
    growthData.values.push(Math.round(currentValue));
  }

  return {
    selectedStrategy,
    ...strategy,
    timelineYears: Math.round(yearsUntilTarget * 10) / 10,
    monthlyContribution: Math.round(monthlyContribution),
    projectedFinalValue: Math.round(projectedValue),
    growthData,
    allStrategies: strategies,
  };
}

// GET /api/recommendations/{goal_id} - Get tailored investment strategies
router.get("/recommendations/:goal_id", requireAuth, async (req, res) => {
  try {
    const { goal_id } = req.params;
    const goal = await findById(goal_id);

    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Verify the goal belongs to the authenticated user
    if (goal.user_id !== req.auth.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const strategy = generateStrategy(goal);

    res.status(200).json({
      goalId: goal._id,
      goalTitle: goal.title,
      ...strategy,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/strategies/compare - Compare different strategies
router.post("/strategies/compare", requireAuth, async (req, res) => {
  try {
    const { goal_id } = req.body;

    if (!goal_id) {
      return res.status(400).json({ error: "goal_id is required" });
    }

    const goal = await findById(goal_id);

    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Verify the goal belongs to the authenticated user
    if (goal.user_id !== req.auth.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const today = new Date();
    const yearsUntilTarget =
      (goal.target_date - today) / (1000 * 60 * 60 * 24 * 365);
    const amountNeeded = goal.target_amount - goal.current_amount;
    const monthlyContribution = amountNeeded / (yearsUntilTarget * 12);

    const strategies = {
      aggressive: {
        name: "Aggressive Growth",
        allocation: { stocks: 90, bonds: 10 },
        expectedAnnualReturn: 0.1,
        monthlyContribution: Math.round(monthlyContribution),
        projectedValue: Math.round(
          goal.current_amount +
            monthlyContribution * 12 * yearsUntilTarget * 1.1,
        ),
      },
      balanced: {
        name: "Balanced Growth",
        allocation: { stocks: 60, bonds: 40 },
        expectedAnnualReturn: 0.07,
        monthlyContribution: Math.round(monthlyContribution),
        projectedValue: Math.round(
          goal.current_amount +
            monthlyContribution * 12 * yearsUntilTarget * 1.07,
        ),
      },
      conservative: {
        name: "Conservative Income",
        allocation: { stocks: 30, bonds: 70 },
        expectedAnnualReturn: 0.04,
        monthlyContribution: Math.round(monthlyContribution),
        projectedValue: Math.round(
          goal.current_amount +
            monthlyContribution * 12 * yearsUntilTarget * 1.04,
        ),
      },
    };

    res.status(200).json({
      goalId: goal._id,
      goalTitle: goal.title,
      timelineYears: Math.round(yearsUntilTarget * 10) / 10,
      strategies,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
