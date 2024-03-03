const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    default: "student",
  },
  roll: {
    type: String,
    unique: true,
  },
  email: {
    type: String,
    unique: true,
  },
  name: {
    type: String,
    default: "",
  },
  semester: [
    {
      amount: {
        type: Number,
        default: 0,
      },
      fineAmount: {
        type: Number,
        default: 0,
      },
      SBIref: {
        type: String,
        default: "",
      },
      semNo: {
        type: String,
        default: "",
      },
      feeType: {
        type: String,
        default: "",
      },
      paymentLink: {
        type: String,
        default: "",
      },
      paymentDate: {
        type: String,
        default: "",
      },
      dueDate: {
        type: String,
      },
      feeStatus: {
        type: String,
        default: "pending",
      },
      receiptURL: {
        type: String,
        default: "",
      },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
