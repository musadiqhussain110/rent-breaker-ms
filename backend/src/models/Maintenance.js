const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    title: { type: String, required: true, trim: true }, // e.g., "Oil change"
    description: { type: String, trim: true },
    cost: { type: Number, min: 0, default: 0 },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    status: { type: String, enum: ["open", "done"], default: "open" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Maintenance", maintenanceSchema);