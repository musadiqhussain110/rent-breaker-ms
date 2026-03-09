const router = require("express").Router();
const auth = require("../middleware/auth");
const Rental = require("../models/Rental");
const Machine = require("../models/Machine");
const Customer = require("../models/Customer");

// GET /api/rentals/health
router.get("/health", auth, (req, res) => {
  res.json({ ok: true, service: "rentals", user: req.user });
});

// GET /api/rentals - list
router.get("/", auth, async (req, res) => {
  const { status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const rentals = await Rental.find(filter)
    .sort({ createdAt: -1 })
    .populate("customer", "name phone email")
    .populate("machine", "name type serialNumber dailyRate status");

  res.json(rentals);
});

// POST /api/rentals - create a rental (rent a machine)
router.post("/", auth, async (req, res) => {
  try {
    const { customerId, machineId, startDate, days, notes } = req.body || {};

    if (!customerId || !machineId || !startDate) {
      return res.status(400).json({ message: "customerId, machineId, startDate are required" });
    }

    const [customer, machine] = await Promise.all([
      Customer.findById(customerId),
      Machine.findById(machineId)
    ]);

    if (!customer) return res.status(404).json({ message: "Customer not found" });
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    if (machine.status !== "available") {
      return res.status(409).json({ message: `Machine not available (status=${machine.status})` });
    }

    const rental = await Rental.create({
      customer: customer._id,
      machine: machine._id,
      startDate: new Date(startDate),
      days: days ? Number(days) : undefined,
      dailyRateSnapshot: machine.dailyRate,
      notes
    });

    machine.status = "rented";
    await machine.save();

    const populated = await Rental.findById(rental._id)
      .populate("customer", "name phone email")
      .populate("machine", "name type serialNumber dailyRate status");

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// POST /api/rentals/:id/return - return a rental
router.post("/:id/return", auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.status === "closed") return res.status(409).json({ message: "Rental already closed" });

    const machine = await Machine.findById(rental.machine);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    const endDate = req.body?.endDate ? new Date(req.body.endDate) : new Date();
    rental.endDate = endDate;
    rental.status = "closed";

    // calculate billable days (at least 1)
    const ms = rental.endDate.getTime() - rental.startDate.getTime();
    const rawDays = Math.ceil(ms / (1000 * 60 * 60 * 24));
    const billableDays = Math.max(1, rawDays);

    rental.totalAmount = billableDays * rental.dailyRateSnapshot;

    await rental.save();

    machine.status = "available";
    await machine.save();

    const populated = await Rental.findById(rental._id)
      .populate("customer", "name phone email")
      .populate("machine", "name type serialNumber dailyRate status");

    return res.json({ ...populated.toObject(), billableDays });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

module.exports = router;