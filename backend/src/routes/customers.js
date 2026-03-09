const router = require("express").Router();
const Customer = require("../models/Customer");
const auth = require("../middleware/auth");

// GET /api/customers/health (protected)
router.get("/health", auth, (req, res) => {
  res.json({ ok: true, service: "customers", user: req.user });
});

// POST /api/customers (protected) - create
router.post("/", auth, async (req, res) => {
  try {
    const { name, phone, email, address, idNumber, notes } = req.body || {};
    if (!name) return res.status(400).json({ message: "name is required" });

    const customer = await Customer.create({
      name,
      phone,
      email,
      address,
      idNumber,
      notes
    });

    return res.status(201).json(customer);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// GET /api/customers (protected) - list + search
router.get("/", auth, async (req, res) => {
  const { q } = req.query;

  const filter = {};
  if (q) {
    filter.$or = [
      { name: { $regex: String(q), $options: "i" } },
      { phone: { $regex: String(q), $options: "i" } },
      { email: { $regex: String(q), $options: "i" } },
      { idNumber: { $regex: String(q), $options: "i" } }
    ];
  }

  const customers = await Customer.find(filter).sort({ createdAt: -1 });
  res.json(customers);
});

// GET /api/customers/:id (protected) - get one
router.get("/:id", auth, async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  res.json(customer);
});

// PUT /api/customers/:id (protected) - update
router.put("/:id", auth, async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updated) return res.status(404).json({ message: "Customer not found" });
    res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// DELETE /api/customers/:id (protected) - delete
router.delete("/:id", auth, async (req, res) => {
  const deleted = await Customer.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Customer not found" });
  res.json({ ok: true });
});

module.exports = router;