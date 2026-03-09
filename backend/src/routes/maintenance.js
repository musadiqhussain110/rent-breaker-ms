const router = require("express").Router();
const auth = require("../middleware/auth");
const Maintenance = require("../models/Maintenance");
const Machine = require("../models/Machine");

// GET /api/maintenance/health
router.get("/health", auth, (req, res) => {
  res.json({ ok: true, service: "maintenance", user: req.user });
});

// GET /api/maintenance - list
router.get("/", auth, async (req, res) => {
  const { status, machineId } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (machineId) filter.machine = machineId;

  const items = await Maintenance.find(filter)
    .sort({ createdAt: -1 })
    .populate("machine", "name type serialNumber status");

  res.json(items);
});

// POST /api/maintenance - open maintenance (sets machine to maintenance)
router.post("/", auth, async (req, res) => {
  try {
    const { machineId, title, description, cost, startDate } = req.body || {};
    if (!machineId || !title) {
      return res.status(400).json({ message: "machineId and title are required" });
    }

    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    if (machine.status === "rented") {
      return res.status(409).json({ message: "Machine is rented; cannot start maintenance" });
    }

    const maintenance = await Maintenance.create({
      machine: machine._id,
      title,
      description,
      cost: cost !== undefined ? Number(cost) : 0,
      startDate: startDate ? new Date(startDate) : new Date()
    });

    machine.status = "maintenance";
    await machine.save();

    const populated = await Maintenance.findById(maintenance._id).populate(
      "machine",
      "name type serialNumber status"
    );

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// POST /api/maintenance/:id/complete - mark done (sets machine to available)
router.post("/:id/complete", auth, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) return res.status(404).json({ message: "Maintenance not found" });
    if (maintenance.status === "done") return res.status(409).json({ message: "Already completed" });

    maintenance.status = "done";
    maintenance.endDate = req.body?.endDate ? new Date(req.body.endDate) : new Date();
    await maintenance.save();

    const machine = await Machine.findById(maintenance.machine);
    if (machine) {
      machine.status = "available";
      await machine.save();
    }

    const populated = await Maintenance.findById(maintenance._id).populate(
      "machine",
      "name type serialNumber status"
    );

    res.json(populated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

module.exports = router;