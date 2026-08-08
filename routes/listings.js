const express = require('express');
const Listing = require('../models/Listing');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
const VALID_TYPES = ['land', 'house', 'apartment', 'commercial'];

router.get('/', async (req, res) => {
  try {
    const { type, district, minPrice, maxPrice, q, favOnly, ids, sort } = req.query;
    const filter = {};

    if (type && VALID_TYPES.includes(type)) filter.type = type;
    if (district) filter.district = { $regex: district, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } }
      ];
    }
    if (favOnly === 'true' && ids) {
      const idList = ids.split(',').filter(Boolean);
      filter._id = { $in: idList };
    }

    let sortSpec = { createdAt: -1 };
    if (sort === 'price-asc') sortSpec = { price: 1 };
    else if (sort === 'price-desc') sortSpec = { price: -1 };
    else if (sort === 'area-desc') sortSpec = { areaSqft: -1 };

    const listings = await Listing.find(filter).sort(sortSpec);
    res.json({ listings });
  } catch (err) {
    console.error('List listings error:', err);
    res.status(500).json({ error: 'Could not load listings.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    res.json({ listing });
  } catch (err) {
    res.status(404).json({ error: 'Listing not found.' });
  }
});

router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      title, type, district, city, price, areaSqft,
      beds, desc, sellerName, sellerPhone
    } = req.body;

    if (!title || !type || !district || !city || !price || !areaSqft || !sellerName || !sellerPhone) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid property type.' });
    }

    const listing = await Listing.create({
      title: String(title).trim(),
      type,
      district: String(district).trim(),
      city: String(city).trim(),
      price: Number(price),
      areaSqft: Number(areaSqft),
      beds: beds ? Number(beds) : null,
      desc: desc ? String(desc).trim() : 'No additional description provided.',
      tags: ['New listing'],
      sellerName: String(sellerName).trim(),
      sellerPhone: String(sellerPhone).trim(),
      sellerEmail: req.user ? req.user.email : null
    });

    res.status(201).json({ listing });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Could not publish your listing.' });
  }
});

module.exports = router;
