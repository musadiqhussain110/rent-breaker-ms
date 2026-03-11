const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Rental = require("../models/Rental");
const Machine = require("../models/Machine");
const Customer = require("../models/Customer");

const PDFDocument = require("pdfkit");

// NOTE:
// - rentalsReadWrite is for admin/staff/operator only
// - customer endpoints use separate middleware below
const rentalsReadWrite = [auth, requireRole("admin", "staff", "operator")];
const rentalsCreate = [auth, requireRole("admin", "staff")];

function calcTotals(rental) {
  const totalAmount = Number(rental.totalAmount || 0);
  const advancePaid = Number(rental.advancePaid || 0);
  const extraPaid = Array.isArray(rental.payments)
    ? rental.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : 0;

  const totalPaid = advancePaid + extraPaid;
  const balance = Math.max(0, totalAmount - totalPaid);

  return { totalAmount, advancePaid, extraPaid, totalPaid, balance };
}

// GET /api/rentals/health
router.get("/health", ...rentalsReadWrite, (req, res) => {
  res.json({ ok: true, service: "rentals", user: req.user });
});

// ✅ GET /api/rentals/my - customer sees their own rentals (Option 2 link via Customer.customerUser)
router.get("/my", auth, requireRole("customer"), async (req, res) => {
  try {
    const customer = await Customer.findOne({ customerUser: req.user.sub });
    if (!customer) {
      return res.status(404).json({
        message:
          "No Customer profile linked to this account. Ask admin/staff to link your user to a customer record."
      });
    }

    const rentals = await Rental.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .populate("customer", "name phone email")
      .populate("machine", "name type serialNumber dailyRate status");

    // attach computed totals for UI convenience
    res.json(
      rentals.map((r) => {
        const o = r.toObject();
        return { ...o, totals: calcTotals(o) };
      })
    );
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// GET /api/rentals - list (admin/staff/operator)
router.get("/", ...rentalsReadWrite, async (req, res) => {
  const { status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const rentals = await Rental.find(filter)
    .sort({ createdAt: -1 })
    .populate("customer", "name phone email")
    .populate("machine", "name type serialNumber dailyRate status");

  // attach computed totals for UI convenience
  res.json(
    rentals.map((r) => {
      const o = r.toObject();
      return { ...o, totals: calcTotals(o) };
    })
  );
});

// POST /api/rentals - create a rental (rent a machine)
router.post("/", ...rentalsCreate, async (req, res) => {
  try {
    const { customerId, machineId, startDate, days, notes, advancePaid } = req.body || {};

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

    const adv = advancePaid === "" || advancePaid === undefined ? 0 : Number(advancePaid);
    if (Number.isNaN(adv) || adv < 0) {
      return res.status(400).json({ message: "advancePaid must be a non-negative number" });
    }

    const rental = await Rental.create({
      customer: customer._id,
      machine: machine._id,
      startDate: new Date(startDate),
      days: days ? Number(days) : undefined,
      dailyRateSnapshot: machine.dailyRate,
      notes,
      advancePaid: adv
    });

    machine.status = "rented";
    await machine.save();

    const populated = await Rental.findById(rental._id)
      .populate("customer", "name phone email")
      .populate("machine", "name type serialNumber dailyRate status");

    const obj = populated.toObject();
    return res.status(201).json({ ...obj, totals: calcTotals(obj) });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// POST /api/rentals/:id/pay - add a payment (admin/staff/operator)
router.post("/:id/pay", ...rentalsReadWrite, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    const { amount, method, note, paidAt } = req.body || {};
    const amt = Number(amount);

    if (!amount && amount !== 0) return res.status(400).json({ message: "amount is required" });
    if (Number.isNaN(amt) || amt <= 0) return res.status(400).json({ message: "amount must be > 0" });

    rental.payments.push({
      amount: amt,
      method: method?.trim() || undefined,
      note: note?.trim() || undefined,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      recordedBy: req.user.sub
    });

    await rental.save();

    const populated = await Rental.findById(rental._id)
      .populate("customer", "name phone email")
      .populate("machine", "name type serialNumber dailyRate status");

    const obj = populated.toObject();
    return res.json({ ...obj, totals: calcTotals(obj) });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// POST /api/rentals/:id/return - return a rental
router.post("/:id/return", ...rentalsReadWrite, async (req, res) => {
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

    const obj = populated.toObject();
    return res.json({ ...obj, billableDays, totals: calcTotals(obj) });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// GET /api/rentals/:id/invoice.pdf - download invoice PDF
// NOTE: allow customer too, but only for their own rentals
router.get("/:id/invoice.pdf", auth, requireRole("admin", "staff", "operator", "customer"), async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate("customer", "name phone email address idNumber customerUser")
      .populate("machine", "name type serialNumber dailyRate status");

    if (!rental) return res.status(404).json({ message: "Rental not found" });

    // ✅ if customer, ensure rental belongs to them
    if (req.user.role === "customer") {
      const linkedCustomer = await Customer.findOne({ customerUser: req.user.sub }).select("_id");
      if (!linkedCustomer || String(linkedCustomer._id) !== String(rental.customer?._id)) {
        return res.status(403).json({ message: "Not allowed to access this invoice" });
      }
    }

    const r = rental.toObject();
    const totals = calcTotals(r);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${r._id}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text("Rent Breaker - Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(11).text(`Invoice ID: ${r._id}`);
    doc.text(`Created: ${new Date(r.createdAt).toLocaleString()}`);
    doc.text(`Status: ${r.status}`);
    doc.moveDown();

    doc.fontSize(12).text("Customer", { underline: true });
    doc.fontSize(11).text(`Name: ${r.customer?.name || "-"}`);
    doc.text(`Phone: ${r.customer?.phone || "-"}`);
    doc.text(`Email: ${r.customer?.email || "-"}`);
    if (r.customer?.address) doc.text(`Address: ${r.customer.address}`);
    if (r.customer?.idNumber) doc.text(`ID: ${r.customer.idNumber}`);
    doc.moveDown();

    doc.fontSize(12).text("Machine", { underline: true });
    doc.fontSize(11).text(`Name: ${r.machine?.name || "-"}`);
    doc.text(`Type: ${r.machine?.type || "-"}`);
    doc.text(`Serial: ${r.machine?.serialNumber || "-"}`);
    doc.text(`Daily Rate (snapshot): ${r.dailyRateSnapshot}`);
    doc.moveDown();

    doc.fontSize(12).text("Rental", { underline: true });
    doc.fontSize(11).text(`Start: ${r.startDate ? new Date(r.startDate).toLocaleString() : "-"}`);
    doc.text(`End: ${r.endDate ? new Date(r.endDate).toLocaleString() : "-"}`);
    doc.text(`Planned Days: ${r.days || "-"}`);
    doc.moveDown();

    doc.fontSize(12).text("Billing", { underline: true });
    doc.fontSize(11).text(`Total Amount: ${totals.totalAmount}`);
    doc.text(`Advance Paid: ${totals.advancePaid}`);
    doc.text(`Extra Payments: ${totals.extraPaid}`);
    doc.text(`Total Paid: ${totals.totalPaid}`);
    doc.text(`Balance: ${totals.balance}`);
    doc.moveDown();

    doc.fontSize(12).text("Payments", { underline: true });
    if (!r.payments || r.payments.length === 0) {
      doc.fontSize(11).text("No additional payments recorded.");
    } else {
      r.payments.forEach((p, idx) => {
        doc.fontSize(11).text(
          `${idx + 1}. ${Number(p.amount)}  ${p.method ? `(${p.method})` : ""}  - ${new Date(p.paidAt).toLocaleString()}`
        );
        if (p.note) doc.fontSize(10).text(`   Note: ${p.note}`);
      });
    }

    if (r.notes) {
      doc.moveDown();
      doc.fontSize(12).text("Notes", { underline: true });
      doc.fontSize(11).text(r.notes);
    }

    doc.end();
  } catch (err) {
    return res.status(500).json({ message: "Invoice PDF generation failed", error: err.message });
  }
});

module.exports = router;