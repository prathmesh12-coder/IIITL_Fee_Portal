const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  senderEmail: {
    type: String,
    unique: true,
  },
  chat: [
    {
      message: {
        type: String,
        default: "",
      },
      textEmail: {
        type: String,
        default: "",
      },
    },
  ],
  unreadCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  lastUpdated: {
    type: Date,
  },
});

module.exports = mongoose.model("Chat", userSchema);
