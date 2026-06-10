const express = require("express");
const { findById, listGoals } = require("../repositories/goals.repository");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

function calculatePMT(targetAmount, currentAmount, annualReturn, years) {
  if (years <= 0) return 0;

  const r = annualReturn / 12;
  const n = years * 12;

  if (r === 0) {
    return Math.max(0, targetAmount - currentAmount) / n;
  }

  // Future value of current savings
  const fvCurrent = currentAmount * Math.pow(1 + r, n);
  const fvNeeded = targetAmount - fvCurrent;

  if (fvNeeded <= 0) return 0;

  // PMT formula
  return (fvNeeded * r) / (Math.pow(1 + r, n) - 1);
}

const strategiesDef = {
  aggressive: {
    name: "Aggressive Growth",
    allocation: { stocks: 90, bonds: 10 },
    expectedAnnualReturn: 0.1,
    description:
      "Invest in Stocks/Equities or Robo-Advisors. High growth potential with higher volatility. Best for beating inflation on long-term goals.",
  },
  balanced: {
    name: "Balanced Growth",
    allocation: { stocks: 60, bonds: 40 },
    expectedAnnualReturn: 0.07,
    description:
      "Invest in EPF (KWSP) or ASB. Moderate growth with balanced risk. Suitable for medium-term goals.",
  },
  conservative: {
    name: "Conservative Income",
    allocation: { stocks: 30, bonds: 70 },
    expectedAnnualReturn: 0.04,
    description:
      "Save in Fixed Deposits (FD) or Money Market Funds. Lower risk with steady income. Best for short-term goals.",
  },
};

function buildStrategyProjection(
  goal,
  def,
  yearsUntilTarget,
  today,
  includePrincipal = false,
) {
  const monthlyContribution = calculatePMT(
    goal.target_amount,
    goal.current_amount,
    def.expectedAnnualReturn,
    yearsUntilTarget,
  );

  const growthData = {
    years: [today.getFullYear()],
    values: [Math.round(goal.current_amount)],
  };
  const monthlyGrowthData = {
    labels: ["Today"],
    values: [Math.round(goal.current_amount)],
  };

  if (includePrincipal) {
    growthData.principal = [Math.round(goal.current_amount)];
    monthlyGrowthData.principal = [Math.round(goal.current_amount)];
  }

  let currentValue = goal.current_amount;
  let currentPrincipal = goal.current_amount;
  const r = def.expectedAnnualReturn / 12;
  const totalMonths = Math.ceil(yearsUntilTarget * 12);
  // Simulate monthly growth to push data points for graph
  for (let m = 1; m <= totalMonths; m++) {
    currentValue = currentValue * (1 + r) + monthlyContribution;
    if (includePrincipal) {
      currentPrincipal += monthlyContribution;
    }

    const d = new Date(today.getFullYear(), today.getMonth() + m, 1);
    monthlyGrowthData.labels.push(
      d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    );
    monthlyGrowthData.values.push(Math.round(currentValue));
    if (includePrincipal) {
      monthlyGrowthData.principal.push(Math.round(currentPrincipal));
    }

    if (m % 12 === 0 || m === totalMonths) {
      growthData.years.push(today.getFullYear() + Math.ceil(m / 12));
      growthData.values.push(Math.round(currentValue));
      if (includePrincipal) {
        growthData.principal.push(Math.round(currentPrincipal));
      }
    }
  }
  // Ensure projected final value is at least the target amount
  const projectedFinalValue = Math.round(
    Math.max(goal.target_amount, currentValue),
  );
  const totalContributions = Math.round(monthlyContribution * totalMonths);
  const contributionEfficiency =
    totalContributions > 0
      ? Number((projectedFinalValue / totalContributions).toFixed(2))
      : null;
  //handles cases where current amount of savings is sufficient to meet the goal without contributions
  const contributionEfficiencyLabel =
    totalContributions > 0
      ? `${contributionEfficiency.toFixed(2)}x`
      : "Already on track";

  return {
    monthlyContribution: Math.round(monthlyContribution),
    projectedFinalValue,
    projectedValue: projectedFinalValue,
    totalContributions,
    contributionEfficiency,
    contributionEfficiencyLabel,
    growthData,
    monthlyGrowthData,
  };
}

// Helper function to calculate investment strategy based on risk appetite and timeline
function generateStrategy(goal) {
  const today = new Date();
  const yearsUntilTarget =
    (goal.target_date - today) / (1000 * 60 * 60 * 24 * 365);

  if (yearsUntilTarget <= 0) {
    throw new Error("Invalid target date: Target date must be in the future.");
  }

  // Select default strategy based on risk appetite and timeline
  let selectedStrategyKey;
  if (goal.risk_appetite >= 4 && yearsUntilTarget > 5) {
    selectedStrategyKey = "aggressive";
  } else if (goal.risk_appetite >= 3 || yearsUntilTarget > 2) {
    selectedStrategyKey = "balanced";
  } else {
    selectedStrategyKey = "conservative";
  }

  const allStrategies = {};
  Object.keys(strategiesDef).forEach((key) => {
    const def = strategiesDef[key];
    const projection = buildStrategyProjection(
      goal,
      def,
      yearsUntilTarget,
      today,
      true,
    );

    allStrategies[key] = {
      ...def,
      ...projection,
    };
  });
  // Calculate contribution efficiency scores for all strategies based on the highest efficiency among them
  const efficiencyValues = Object.values(allStrategies).map(
    (strategy) => strategy.contributionEfficiency,
  );
  const maxEfficiency = Math.max(...efficiencyValues, 0);

  Object.keys(allStrategies).forEach((key) => {
    allStrategies[key].contributionEfficiencyScore = maxEfficiency
      ? Math.round(
          (allStrategies[key].contributionEfficiency / maxEfficiency) * 100,
        )
      : 0;
  });

  return {
    selectedStrategy: selectedStrategyKey,
    timelineYears: Math.round(yearsUntilTarget * 10) / 10,
    allStrategies,
    // Provide top-level backwards compatibility for the initially selected strategy
    ...allStrategies[selectedStrategyKey],
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

    if (goal.user_id !== req.auth.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const today = new Date();
    const yearsUntilTarget =
      (goal.target_date - today) / (1000 * 60 * 60 * 24 * 365);

    if (yearsUntilTarget <= 0) {
      return res.status(400).json({
        error: "Invalid target date: Target date must be in the future.",
      });
    }

    const strategies = {};
    Object.keys(strategiesDef).forEach((key) => {
      const def = strategiesDef[key];
      const projection = buildStrategyProjection(
        goal,
        def,
        yearsUntilTarget,
        today,
        false,
      );

      strategies[key] = {
        ...def,
        ...projection,
      };
    });

    const efficiencyValues = Object.values(strategies).map(
      (strategy) => strategy.contributionEfficiency,
    );
    const maxEfficiency = Math.max(...efficiencyValues, 0);

    Object.keys(strategies).forEach((key) => {
      strategies[key].contributionEfficiencyScore = maxEfficiency
        ? Math.round(
            (strategies[key].contributionEfficiency / maxEfficiency) * 100,
          )
        : 0;
    });

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

router.calculatePMT = calculatePMT;
router.generateStrategy = generateStrategy;
module.exports = router;
