const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  batch: {
    type: String,
  },
  rollPrefix: {
    type: String,
  },
  batchStrength: {
    type: Number,
  },
});

module.exports = mongoose.model("Batch", batchSchema);
