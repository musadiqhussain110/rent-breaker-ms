function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Missing user role" });

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
}

module.exports = requireRole;