const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "auth" });
});

// POST /api/auth/register
// Public: only registers CUSTOMER accounts (prevents people registering as admin/staff)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      passwordHash,
      role: "customer"
    });

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    return res.status(500).json({ message: "Register failed", error: err.message });
  }
});

// POST /api/auth/users (admin only)
// Admin creates staff/operator/admin/customer accounts
router.post("/users", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!email || !password || !role) {
      return res.status(400).json({ message: "email, password, role are required" });
    }

    const allowed = ["admin", "staff", "operator", "customer"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${allowed.join(", ")}` });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      passwordHash,
      role
    });

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    return res.status(500).json({ message: "Create user failed", error: err.message });
  }
});

// ✅ GET /api/auth/users (admin only) - list users (without passwords)
// Optional query params:
// - q: search by name/email
// - role: filter by role
router.get("/users", auth, requireRole("admin"), async (req, res) => {
  try {
    const { q, role } = req.query;

    const filter = {};
    if (role) filter.role = role;

    if (q) {
      const s = String(q);
      filter.$or = [
        { name: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .select("_id name email role createdAt updatedAt")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    return res.status(500).json({ message: "List users failed", error: err.message });
  }
});

// GET /api/auth/me (protected)
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.sub).select("_id name email role");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { sub: String(user._id), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
});

module.exports = router;