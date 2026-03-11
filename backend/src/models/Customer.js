const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    // ✅ link customer record to a login account (Option 2)
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    idNumber: { type: String, trim: true }, // optional (CNIC/ID/License)
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);