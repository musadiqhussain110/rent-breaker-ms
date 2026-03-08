const mongoose = require("mongoose");

const machineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true }, // e.g., "Excavator", "Generator"
    serialNumber: { type: String, trim: true, unique: true, sparse: true },
    dailyRate: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["available", "rented", "maintenance"],
      default: "available"
    },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Machine", machineSchema);