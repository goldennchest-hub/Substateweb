const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['land', 'house', 'apartment', 'commercial'] },
  district: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  areaSqft: { type: Number, required: true, min: 0 },
  beds: { type: Number, default: null },
  baths: { type: Number, default: null },
  year: { type: Number, default: null },
  desc: { type: String, default: '' },
  tags: { type: [String], default: [] },
  sellerName: { type: String, required: true, trim: true },
  sellerPhone: { type: String, required: true, trim: true },
  sellerEmail: { type: String, default: null }, // set automatically if the poster was logged in
  featured: { type: Boolean, default: false }
}, { timestamps: true }); // createdAt = date listed

module.exports = mongoose.model('Listing', listingSchema);
