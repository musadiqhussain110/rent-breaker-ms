const mongoose = require("mongoose");

const rentalRequestSchema = new mongoose.Schema(
  {
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },

    startDate: { type: Date, required: true },
    days: { type: Number, min: 1 },
    notes: { type: String, trim: true },

    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },

    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },
    decisionNote: { type: String, trim: true },

    rental: { type: mongoose.Schema.Types.ObjectId, ref: "Rental" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RentalRequest", rentalRequestSchema);