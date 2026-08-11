const express = require('express');
const Listing = require('../models/Listing');
const { optionalAuth, requireAuth } = require('../middleware/auth');

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

// IMPORTANT: this must come BEFORE '/:id' or Express will treat "mine" as an id.
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const listings = await Listing.find({ sellerEmail: req.user.email }).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    console.error('My listings error:', err);
    res.status(500).json({ error: 'Could not load your listings.' });
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
      beds, desc, sellerName, sellerPhone, imageUrl
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
      sellerEmail: req.user ? req.user.email : null,
      imageUrl: imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('https://') ? imageUrl : null
    });

    res.status(201).json({ listing });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Could not publish your listing.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (!listing.sellerEmail || listing.sellerEmail !== req.user.email) {
      return res.status(403).json({ error: 'You can only edit your own listings.' });
    }

    const {
      title, type, district, city, price, areaSqft,
      beds, desc, sellerName, sellerPhone, imageUrl
    } = req.body;

    if (!title || !type || !district || !city || !price || !areaSqft || !sellerName || !sellerPhone) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid property type.' });
    }

    listing.title = String(title).trim();
    listing.type = type;
    listing.district = String(district).trim();
    listing.city = String(city).trim();
    listing.price = Number(price);
    listing.areaSqft = Number(areaSqft);
    listing.beds = beds ? Number(beds) : null;
    listing.desc = desc ? String(desc).trim() : listing.desc;
    listing.sellerName = String(sellerName).trim();
    listing.sellerPhone = String(sellerPhone).trim();
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('https://')) {
      listing.imageUrl = imageUrl;
    }

    await listing.save();
    res.json({ listing });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ error: 'Could not update your listing.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (!listing.sellerEmail || listing.sellerEmail !== req.user.email) {
      return res.status(403).json({ error: 'You can only delete your own listings.' });
    }
    await listing.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ error: 'Could not delete your listing.' });
  }
});

module.exports = router;
