// Monkey-patches the static methods on the real Mongoose models with an
// in-memory implementation, so route logic (validation, hashing, JWTs,
// filtering) can be exercised end-to-end without a live MongoDB connection.
// This file is test-only and is never shipped/used in production.

const User = require('../models/User');
const Login = require('../models/Login');
const Listing = require('../models/Listing');

let seq = 1;
function fakeId() { return 'fakeid_' + (seq++); }

function makeQuery(arrPromiseOrArr) {
  let arr = arrPromiseOrArr;
  const q = {
    sort(spec) {
      const key = Object.keys(spec)[0];
      const dir = spec[key];
      arr = [...arr].sort((a, b) => {
        if (a[key] < b[key]) return -1 * dir;
        if (a[key] > b[key]) return 1 * dir;
        return 0;
      });
      return q;
    },
    limit(n) { arr = arr.slice(0, n); return q; },
    then(resolve, reject) { return Promise.resolve(arr).then(resolve, reject); },
    catch(fn) { return Promise.resolve(arr).catch(fn); }
  };
  return q;
}

function matchesFilter(doc, filter) {
  for (const key of Object.keys(filter)) {
    const cond = filter[key];
    if (key === '$or') {
      if (!cond.some(sub => matchesFilter(doc, sub))) return false;
      continue;
    }
    if (cond && typeof cond === 'object' && !(cond instanceof RegExp)) {
      if (cond.$regex !== undefined) {
        const re = new RegExp(cond.$regex, cond.$options || '');
        if (!re.test(doc[key] || '')) return false;
      } else if (cond.$gte !== undefined || cond.$lte !== undefined) {
        if (cond.$gte !== undefined && !(doc[key] >= cond.$gte)) return false;
        if (cond.$lte !== undefined && !(doc[key] <= cond.$lte)) return false;
      } else if (cond.$in !== undefined) {
        if (!cond.$in.includes(String(doc._id))) return false;
      } else {
        return false;
      }
    } else {
      if (doc[key] !== cond) return false;
    }
  }
  return true;
}

function applyProjection(docs, projection) {
  if (!projection || typeof projection !== 'string') return docs;
  const fields = projection.split(/\s+/).filter(Boolean);
  return docs.map(doc => {
    const out = { _id: doc._id };
    fields.forEach(f => { out[f] = doc[f]; });
    return out;
  });
}

function installFakes() {
  const usersDB = [];
  const loginsDB = [];
  const listingsDB = [];

  User.findOne = async (filter) => usersDB.find(u => matchesFilter(u, filter)) || null;
  User.findById = async (id) => usersDB.find(u => u._id === id) || null;
  User.create = async (data) => {
    const doc = { _id: fakeId(), ...data, createdAt: new Date(), updatedAt: new Date() };
    usersDB.push(doc);
    return doc;
  };
  User.find = (filter = {}, projection) =>
    makeQuery(applyProjection(usersDB.filter(u => matchesFilter(u, filter)), projection));

  Login.create = async (data) => {
    const doc = { _id: fakeId(), ...data, createdAt: new Date() };
    loginsDB.push(doc);
    return doc;
  };
  Login.find = (filter = {}, projection) =>
    makeQuery(applyProjection(loginsDB.filter(l => matchesFilter(l, filter)), projection));

  Listing.find = (filter = {}) => makeQuery(listingsDB.filter(l => matchesFilter(l, filter)));
  Listing.findById = async (id) => listingsDB.find(l => l._id === id) || null;
  Listing.create = async (data) => {
    const doc = { _id: fakeId(), ...data, createdAt: new Date(), updatedAt: new Date() };
    listingsDB.push(doc);
    return doc;
  };
  Listing.countDocuments = async () => listingsDB.length;
  Listing.insertMany = async (arr) => {
    const docs = arr.map(d => ({ _id: fakeId(), ...d, createdAt: new Date(), updatedAt: new Date() }));
    listingsDB.push(...docs);
    return docs;
  };

  return { usersDB, loginsDB, listingsDB };
}

module.exports = { installFakes };
