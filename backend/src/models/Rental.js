const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, trim: true }, // e.g., cash, card, bank
    note: { type: String, trim: true },
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const rentalSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date },

    dailyRateSnapshot: { type: Number, required: true, min: 0 }, // store rate at time of renting
    days: { type: Number, min: 1 }, // optional planned days

    status: { type: String, enum: ["open", "closed"], default: "open" },

    // Billing
    totalAmount: { type: Number, min: 0 }, // computed on return/close
    advancePaid: { type: Number, min: 0, default: 0 }, // entered at create time
    payments: { type: [paymentSchema], default: [] }, // additional payments

    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);