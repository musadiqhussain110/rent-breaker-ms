const router = require("express").Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "customers" });
});

module.exports = router;