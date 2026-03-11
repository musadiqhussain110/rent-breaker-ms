const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const RentalRequest = require("../models/RentalRequest");
const Rental = require("../models/Rental");
const Machine = require("../models/Machine");
const User = require("../models/User");
const Customer = require("../models/Customer");

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// GET /api/requests/health
router.get("/health", auth, requireRole("admin", "staff", "customer"), (req, res) => {
  res.json({ ok: true, service: "requests", user: req.user });
});

// GET /api/requests
// customer => only own
// staff/admin => all (optional status filter)
router.get("/", auth, requireRole("admin", "staff", "customer"), async (req, res) => {
  const { status } = req.query;
  const filter = {};

  if (status) filter.status = status;

  if (req.user.role === "customer") {
    filter.customerUser = req.user.sub;
  }

  const items = await RentalRequest.find(filter)
    .sort({ createdAt: -1 })
    .populate("machine", "name type serialNumber dailyRate status")
    .populate("customerUser", "name email role")
    .populate("decidedBy", "name email role")
    .populate("rental");

  res.json(items);
});

// POST /api/requests (customer)
// body: { machineId, startDate, days?, notes? }
router.post("/", auth, requireRole("customer"), async (req, res) => {
  try {
    const { machineId, startDate, days, notes } = req.body || {};
    if (!machineId || !startDate) {
      return res.status(400).json({ message: "machineId and startDate are required" });
    }

    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    if (machine.status !== "available") {
      return res.status(409).json({ message: `Machine not available (status=${machine.status})` });
    }

    // reserve machine immediately so others can't request it
    machine.status = "reserved";
    await machine.save();

    const item = await RentalRequest.create({
      customerUser: req.user.sub,
      machine: machine._id,
      startDate: new Date(startDate),
      days: days ? Number(days) : undefined,
      notes: notes?.trim() || undefined
    });

    const populated = await RentalRequest.findById(item._id)
      .populate("machine", "name type serialNumber dailyRate status")
      .populate("customerUser", "name email role");

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/requests/:id/cancel (customer)
// Only if:
// - request belongs to user
// - status is pending
// - createdAt is within last 2 hours
router.post("/:id/cancel", auth, requireRole("customer"), async (req, res) => {
  try {
    const reqItem = await RentalRequest.findById(req.params.id);
    if (!reqItem) return res.status(404).json({ message: "Request not found" });

    if (String(reqItem.customerUser) !== String(req.user.sub)) {
      return res.status(403).json({ message: "Forbidden: not your request" });
    }

    if (reqItem.status !== "pending") {
      return res.status(409).json({ message: "Only pending requests can be cancelled" });
    }

    const createdAt = reqItem.createdAt ? new Date(reqItem.createdAt).getTime() : null;
    if (!createdAt) return res.status(400).json({ message: "Invalid request timestamp" });

    const ageMs = Date.now() - createdAt;
    if (ageMs > TWO_HOURS_MS) {
      return res.status(409).json({ message: "Cancel window expired (2 hours)" });
    }

    reqItem.status = "cancelled";
    reqItem.decidedAt = new Date();
    reqItem.decisionNote = "Cancelled by customer";
    await reqItem.save();

    // release machine if it is reserved
    const machine = await Machine.findById(reqItem.machine);
    if (machine && machine.status === "reserved") {
      machine.status = "available";
      await machine.save();
    }

    const populated = await RentalRequest.findById(reqItem._id)
      .populate("machine", "name type serialNumber dailyRate status")
      .populate("customerUser", "name email role");

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/requests/:id/approve (staff/admin)
// Creates real Rental and marks request approved
router.post("/:id/approve", auth, requireRole("admin", "staff"), async (req, res) => {
  try {
    const reqItem = await RentalRequest.findById(req.params.id);
    if (!reqItem) return res.status(404).json({ message: "Request not found" });
    if (reqItem.status !== "pending") return res.status(409).json({ message: "Request already decided" });

    const machine = await Machine.findById(reqItem.machine);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    // allow approval if machine is reserved or available
    if (!["available", "reserved"].includes(machine.status)) {
      return res.status(409).json({ message: `Machine not available (status=${machine.status})` });
    }

    const customerUser = await User.findById(reqItem.customerUser);
    if (!customerUser) return res.status(404).json({ message: "Customer user not found" });

    // Find or create a Customer record (by email)
    const email = String(customerUser.email || "").toLowerCase();
    let customer = null;

    if (email) {
      customer = await Customer.findOne({ email });
    }

    if (!customer) {
      customer = await Customer.create({
        name: customerUser.name || customerUser.email,
        email: email || undefined
      });
    }

    const rental = await Rental.create({
      customer: customer._id,
      machine: machine._id,
      startDate: reqItem.startDate,
      days: reqItem.days,
      dailyRateSnapshot: machine.dailyRate,
      notes: reqItem.notes
    });

    machine.status = "rented";
    await machine.save();

    reqItem.status = "approved";
    reqItem.decidedBy = req.user.sub;
    reqItem.decidedAt = new Date();
    reqItem.decisionNote = req.body?.decisionNote?.trim() || undefined;
    reqItem.rental = rental._id;
    await reqItem.save();

    const populated = await RentalRequest.findById(reqItem._id)
      .populate("machine", "name type serialNumber dailyRate status")
      .populate("customerUser", "name email role")
      .populate("decidedBy", "name email role")
      .populate("rental");

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/requests/:id/reject (staff/admin)
router.post("/:id/reject", auth, requireRole("admin", "staff"), async (req, res) => {
  try {
    const reqItem = await RentalRequest.findById(req.params.id);
    if (!reqItem) return res.status(404).json({ message: "Request not found" });
    if (reqItem.status !== "pending") return res.status(409).json({ message: "Request already decided" });

    reqItem.status = "rejected";
    reqItem.decidedBy = req.user.sub;
    reqItem.decidedAt = new Date();
    reqItem.decisionNote = req.body?.decisionNote?.trim() || undefined;
    await reqItem.save();

    // release machine (make it available again) if it was reserved
    const machine = await Machine.findById(reqItem.machine);
    if (machine && machine.status === "reserved") {
      machine.status = "available";
      await machine.save();
    }

    const populated = await RentalRequest.findById(reqItem._id)
      .populate("machine", "name type serialNumber dailyRate status")
      .populate("customerUser", "name email role")
      .populate("decidedBy", "name email role");

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;