const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const Machine = require("../models/Machine");
const Rental = require("../models/Rental");
const Maintenance = require("../models/Maintenance");
const Customer = require("../models/Customer");
const CustomerBehaviorEvent = require("../models/CustomerBehaviorEvent");

const { getMachineRecommendations } = require("../services/aiClient");
const aiReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
const aiWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/health", aiReadLimiter, auth, requireRole("admin", "staff", "customer"), async (req, res) => {
  res.json({ ok: true, service: "ai", aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000" });
});

router.post("/recommendations/machines", aiWriteLimiter, auth, requireRole("admin", "staff", "customer"), async (req, res) => {
  try {
    const { location, limit } = req.body || {};
    const cappedLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const machineFilter = { status: "available" };
    if (location) machineFilter.location = String(location);

    const [machines, rentals, maintenance, behaviorEvents, customer] = await Promise.all([
      Machine.find(machineFilter).lean(),
      Rental.find({ createdAt: { $gte: oneYearAgo } }).sort({ createdAt: -1 }).limit(2000).lean(),
      Maintenance.find({ createdAt: { $gte: oneYearAgo } }).sort({ createdAt: -1 }).limit(2000).lean(),
      req.user.role === "customer"
        ? CustomerBehaviorEvent.find({ customerUser: req.user.sub }).sort({ createdAt: -1 }).limit(500).lean()
        : Promise.resolve([]),
      req.user.role === "customer"
        ? Customer.findOne({ customerUser: req.user.sub }).select("_id").lean()
        : Promise.resolve(null)
    ]);

    const customerRentals = customer ? rentals.filter((r) => String(r.customer) === String(customer._id)) : [];

    const result = await getMachineRecommendations({
      user: {
        id: String(req.user.sub),
        role: req.user.role,
        preferredLocation: location || undefined
      },
      machines,
      rentals,
      maintenance,
      customerRentals,
      behaviorEvents,
      limit: cappedLimit
    });

    return res.json(result);
  } catch (err) {
    return res.status(502).json({
      message: "Failed to retrieve AI recommendations",
      error: err.message
    });
  }
});

module.exports = router;
