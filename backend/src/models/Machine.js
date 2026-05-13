const mongoose = require("mongoose");

const machineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Existing field in your app (keep)
    type: { type: String, required: true, trim: true }, // e.g., "Excavator", "Generator"

    // ✅ SRS fields added
    capacity: { type: String, trim: true }, // e.g., "10 ton" or "5000W" (string is flexible)
    location: { type: String, trim: true }, // e.g., "Lahore"

    serialNumber: { type: String, trim: true, unique: true, sparse: true },
    dailyRate: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["available", "reserved", "rented", "maintenance"],
      default: "available"
    },

    // ✅ Maintenance scheduling (will be used in Step 3 too)
    nextMaintenanceDate: { type: Date },

    // AI and forecasting support
    warehouse: { type: String, trim: true },
    usageHours: { type: Number, min: 0, default: 0 },
    breakdownCount: { type: Number, min: 0, default: 0 },
    uptimePercent: { type: Number, min: 0, max: 100, default: 100 },
    utilizationScore: { type: Number, min: 0, max: 1, default: 0 },
    maintenanceCostTotal: { type: Number, min: 0, default: 0 },
    lastFailureAt: { type: Date },

    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Machine", machineSchema);
