const express = require("express");

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const goalsRoutes = require("./goals.routes");
const recommendationsRoutes = require("./recommendations.routes");
const marketRoutes = require("./market.routes");
const calculatorRoutes = require("./calculator.routes");

const router = express.Router();

router.use(authRoutes);
router.use(userRoutes);
router.use("/goals", goalsRoutes);
router.use(recommendationsRoutes);
router.use(marketRoutes);
router.use(calculatorRoutes);

module.exports = router;
