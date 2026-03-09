const router = require("express").Router();
const auth = require("../middleware/auth");
const Rental = require("../models/Rental");
const Machine = require("../models/Machine");

router.get("/health", auth, (req, res) => {
  res.json({ ok: true, service: "reports", user: req.user });
});

// GET /api/reports/summary
// Returns counts + revenue totals (closed rentals only)
router.get("/summary", auth, async (req, res) => {
  const [machineCounts, openRentals, closedRentals] = await Promise.all([
    Machine.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Rental.countDocuments({ status: "open" }),
    Rental.aggregate([
      { $match: { status: "closed" } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, rentals: { $sum: 1 } } }
    ])
  ]);

  const revenue = closedRentals[0]?.revenue || 0;
  const rentalsClosed = closedRentals[0]?.rentals || 0;

  res.json({
    machinesByStatus: machineCounts.reduce((acc, x) => {
      acc[x._id] = x.count;
      return acc;
    }, {}),
    rentals: { open: openRentals, closed: rentalsClosed },
    revenue
  });
});

module.exports = router;