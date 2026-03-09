const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date },

    dailyRateSnapshot: { type: Number, required: true, min: 0 }, // store rate at time of renting
    days: { type: Number, min: 1 }, // optional planned days

    status: { type: String, enum: ["open", "closed"], default: "open" },

    totalAmount: { type: Number, min: 0 }, // filled on return
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);