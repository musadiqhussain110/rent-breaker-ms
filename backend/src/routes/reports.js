const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Rental = require("../models/Rental");
const Machine = require("../models/Machine");
const Customer = require("../models/Customer");

const staffOnly = [auth, requireRole("admin", "staff")];

function parseDateRange(req) {
  // expects YYYY-MM-DD (from frontend date inputs)
  const fromStr = req.query.from;
  const toStr = req.query.to;

  const from = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : null;
  const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null;

  if (from && Number.isNaN(from.getTime())) return { error: "Invalid from date" };
  if (to && Number.isNaN(to.getTime())) return { error: "Invalid to date" };
  if (from && to && from > to) return { error: "from must be <= to" };

  return { from, to };
}

router.get("/health", ...staffOnly, (req, res) => {
  res.json({ ok: true, service: "reports", user: req.user });
});

// GET /api/reports/summary
// Returns counts + revenue totals (closed rentals only)
router.get("/summary", ...staffOnly, async (req, res) => {
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

// GET /api/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
// Revenue from CLOSED rentals whose endDate is in range
router.get("/revenue", ...staffOnly, async (req, res) => {
  const { from, to, error } = parseDateRange(req);
  if (error) return res.status(400).json({ message: error });

  const match = { status: "closed" };
  if (from || to) {
    match.endDate = {};
    if (from) match.endDate.$gte = from;
    if (to) match.endDate.$lte = to;
  }

  const rows = await Rental.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$totalAmount" },
        rentals: { $sum: 1 },
        avgRental: { $avg: "$totalAmount" }
      }
    }
  ]);

  res.json({
    from: req.query.from || null,
    to: req.query.to || null,
    revenue: rows[0]?.revenue || 0,
    rentalsClosed: rows[0]?.rentals || 0,
    avgRental: rows[0]?.avgRental || 0
  });
});

// GET /api/reports/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
// Groups CLOSED rentals by endDate day
router.get("/daily", ...staffOnly, async (req, res) => {
  const { from, to, error } = parseDateRange(req);
  if (error) return res.status(400).json({ message: error });

  const match = { status: "closed" };
  if (from || to) {
    match.endDate = {};
    if (from) match.endDate.$gte = from;
    if (to) match.endDate.$lte = to;
  }

  const rows = await Rental.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$endDate" } },
        revenue: { $sum: "$totalAmount" },
        rentals: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    from: req.query.from || null,
    to: req.query.to || null,
    days: rows.map((r) => ({ day: r._id, rentals: r.rentals, revenue: r.revenue }))
  });
});

// GET /api/reports/utilization?from=YYYY-MM-DD&to=YYYY-MM-DD
// Utilization based on CLOSED rentals endDate range
// Also computes billableDays using same ceil logic as return route.
router.get("/utilization", ...staffOnly, async (req, res) => {
  const { from, to, error } = parseDateRange(req);
  if (error) return res.status(400).json({ message: error });

  const match = { status: "closed" };
  if (from || to) {
    match.endDate = {};
    if (from) match.endDate.$gte = from;
    if (to) match.endDate.$lte = to;
  }

  const rows = await Rental.aggregate([
    { $match: match },
    {
      $addFields: {
        billableDays: {
          $max: [
            1,
            {
              $ceil: {
                $divide: [{ $subtract: ["$endDate", "$startDate"] }, 1000 * 60 * 60 * 24]
              }
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: "$machine",
        rentals: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
        rentalDays: { $sum: "$billableDays" }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  // attach machine info
  const machineIds = rows.map((r) => r._id);
  const machines = await Machine.find({ _id: { $in: machineIds } }).select("_id name type serialNumber");

  const machineMap = machines.reduce((acc, m) => {
    acc[String(m._id)] = m;
    return acc;
  }, {});

  res.json({
    from: req.query.from || null,
    to: req.query.to || null,
    machines: rows.map((r) => ({
      machine: machineMap[String(r._id)] || { _id: r._id },
      rentals: r.rentals,
      rentalDays: r.rentalDays,
      revenue: r.revenue
    }))
  });
});

// GET /api/reports/customer/:id/history
router.get("/customer/:id/history", ...staffOnly, async (req, res) => {
  const customer = await Customer.findById(req.params.id).select("_id name phone email address idNumber");
  if (!customer) return res.status(404).json({ message: "Customer not found" });

  const rentals = await Rental.find({ customer: customer._id })
    .sort({ createdAt: -1 })
    .populate("machine", "name type serialNumber")
    .select("_id status startDate endDate totalAmount dailyRateSnapshot advancePaid payments createdAt");

  // compute totals paid/balance per rental (same logic as rentals route)
  const items = rentals.map((r) => {
    const o = r.toObject();
    const extraPaid = Array.isArray(o.payments)
      ? o.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      : 0;
    const advancePaid = Number(o.advancePaid || 0);
    const totalPaid = advancePaid + extraPaid;
    const totalAmount = Number(o.totalAmount || 0);
    const balance = Math.max(0, totalAmount - totalPaid);

    return { ...o, totals: { totalAmount, advancePaid, extraPaid, totalPaid, balance } };
  });

  res.json({ customer, rentals: items });
});
//
// GET /api/reports/monthly?from=YYYY-MM-DD&to=YYYY-MM-DD
// Groups CLOSED rentals by endDate month (YYYY-MM)
router.get("/monthly", ...staffOnly, async (req, res) => {
  const { from, to, error } = parseDateRange(req);
  if (error) return res.status(400).json({ message: error });

  const match = { status: "closed" };
  if (from || to) {
    match.endDate = {};
    if (from) match.endDate.$gte = from;
    if (to) match.endDate.$lte = to;
  }

  const rows = await Rental.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$endDate" } },
        revenue: { $sum: "$totalAmount" },
        rentals: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    from: req.query.from || null,
    to: req.query.to || null,
    months: rows.map((r) => ({ month: r._id, rentals: r.rentals, revenue: r.revenue }))
  });
});
module.exports = router;