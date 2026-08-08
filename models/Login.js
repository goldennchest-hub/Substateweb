const mongoose = require('mongoose');

const loginSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true }
}, { timestamps: true }); // createdAt = login time

module.exports = mongoose.model('Login', loginSchema);
