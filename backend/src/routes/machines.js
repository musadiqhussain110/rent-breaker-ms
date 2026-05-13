const router = require("express").Router();
const Machine = require("../models/Machine");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { logAuditEvent } = require("../services/auditLogger");

// Allowed roles
const anyUser = [auth, requireRole("admin", "staff", "operator", "customer")];
const staffOrAdmin = [auth, requireRole("admin", "staff")];
const adminOnly = [auth, requireRole("admin")];

// GET /api/machines/health (protected)
router.get("/health", ...anyUser, (req, res) => {
  res.json({ ok: true, service: "machines", user: req.user });
});

// POST /api/machines (protected) - create
router.post("/", ...staffOrAdmin, async (req, res) => {
  try {
    const { name, type, capacity, location, serialNumber, dailyRate, status, nextMaintenanceDate, notes } = req.body || {};

    if (!name || !type || dailyRate === undefined) {
      return res.status(400).json({ message: "name, type, and dailyRate are required" });
    }

    let nextMaint = undefined;
    if (nextMaintenanceDate) {
      nextMaint = new Date(nextMaintenanceDate);
      if (Number.isNaN(nextMaint.getTime())) {
        return res.status(400).json({ message: "nextMaintenanceDate must be a valid date" });
      }
    }

    const machine = await Machine.create({
      name,
      type,
      capacity,
      location,
      serialNumber,
      dailyRate,
      status,
      nextMaintenanceDate: nextMaint,
      notes
    });

    await logAuditEvent({
      actorUser: req.user.sub,
      actorRole: req.user.role,
      eventType: "machine_created",
      entityType: "Machine",
      entityId: machine._id,
      metadata: { status: machine.status, location: machine.location }
    });

    return res.status(201).json(machine);
  } catch (err) {
    // duplicate serialNumber, etc.
    return res.status(400).json({ message: err.message });
  }
});

// GET /api/machines (protected) - list
router.get("/", ...anyUser, async (req, res) => {
  const { status, type, q } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  if (q) {
    filter.$or = [
      { name: { $regex: String(q), $options: "i" } },
      { type: { $regex: String(q), $options: "i" } },
      { serialNumber: { $regex: String(q), $options: "i" } }
    ];
  }

  const machines = await Machine.find(filter).sort({ createdAt: -1 });
  res.json(machines);
});

// GET /api/machines/:id (protected) - get one
router.get("/:id", ...anyUser, async (req, res) => {
  const machine = await Machine.findById(req.params.id);
  if (!machine) return res.status(404).json({ message: "Machine not found" });
  res.json(machine);
});

// PUT /api/machines/:id (protected) - update
router.put("/:id", ...staffOrAdmin, async (req, res) => {
  try {
    const previous = await Machine.findById(req.params.id).lean();
    const updated = await Machine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updated) return res.status(404).json({ message: "Machine not found" });

    const statusChanged = previous && previous.status !== updated.status;
    await logAuditEvent({
      actorUser: req.user.sub,
      actorRole: req.user.role,
      eventType: statusChanged ? "machine_status_changed" : "machine_updated",
      entityType: "Machine",
      entityId: updated._id,
      metadata: statusChanged
        ? { from: previous.status, to: updated.status }
        : { location: updated.location, dailyRate: updated.dailyRate }
    });

    res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// DELETE /api/machines/:id (protected) - delete
router.delete("/:id", ...adminOnly, async (req, res) => {
  const deleted = await Machine.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Machine not found" });
  await logAuditEvent({
    actorUser: req.user.sub,
    actorRole: req.user.role,
    eventType: "machine_deleted",
    entityType: "Machine",
    entityId: deleted._id,
    metadata: { name: deleted.name, serialNumber: deleted.serialNumber }
  });
  res.json({ ok: true });
});

module.exports = router;
