const router = require("express").Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "auth" });
});

module.exports = router;