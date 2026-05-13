const mongoose = require("mongoose");

const customerBehaviorEventSchema = new mongoose.Schema(
  {
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventType: {
      type: String,
      enum: ["view_machine", "request_machine", "approve_request", "reject_request", "rent_machine"],
      required: true
    },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
    location: { type: String, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

customerBehaviorEventSchema.index({ customerUser: 1, createdAt: -1 });
customerBehaviorEventSchema.index({ machine: 1, createdAt: -1 });

module.exports = mongoose.model("CustomerBehaviorEvent", customerBehaviorEventSchema);
