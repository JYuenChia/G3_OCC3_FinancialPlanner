const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { requireAuth } = require("../middleware/auth.middleware");
const { calculationCreateSchema } = require("../schemas/calculation.schema");
const calculationsRepository = require("../repositories/calculations.repository");
const router = express.Router();

router.post("/calculations", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { title, calculation } = req.body;

    if (!title || !calculation) {
      return res.status(400).json({ error: "Title and calculation are required" });
    }

    const calculationData = {
      _id: uuidv4(),
      user_id: userId,
      title,
      initial: calculation.initial,
      rate_percent: calculation.ratePercent,
      years: calculation.years,
      final_amount: calculation.finalAmount,
      profit: calculation.roi,
    };

    const validated = calculationCreateSchema.parse(calculationData);
    const created = await calculationsRepository.createCalculation(validated);

    res.status(201).json({
      success: true,
      calculation: created,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get("/calculations", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const calculations = await calculationsRepository.listCalculations({
      userId,
    });
    res.status(200).json({
      success: true,
      calculations,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/calculations/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

    const calculation = await calculationsRepository.findById(id);
    if (!calculation) {
      return res.status(404).json({ error: "Calculation not found" });
    }

    if (calculation.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await calculationsRepository.deleteCalculation(id);
    res.status(200).json({
      success: true,
      message: "Calculation deleted",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/calculations", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    await calculationsRepository.deleteAllCalculations(userId);
    res.status(200).json({
      success: true,
      message: "All calculations cleared",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
