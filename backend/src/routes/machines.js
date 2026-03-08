const router = require("express").Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "machines" });
});

module.exports = router;