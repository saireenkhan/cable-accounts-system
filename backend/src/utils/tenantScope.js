/**
 * tenantScope.js
 *
 * Wraps a Mongoose model so every query is automatically scoped to the
 * current tenant (req.tenantId).
 *
 * Usage in a controller:
 *   const tenantScope = require('../utils/tenantScope');
 *   const CustomerModel = require('../models/Customer');
 *
 *   exports.getCustomers = async (req, res) => {
 *     const Customer = tenantScope(CustomerModel, req);
 *     const list = await Customer.find({});  // ← auto-filtered by tenantId
 *   };
 */

const METHODS_TO_SCOPE = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'updateMany',
  'updateOne',
  'replaceOne',
];

function tenantScope(Model, req) {
  const tenantId = req && req.tenantId;

  if (!tenantId) {
    throw new Error(
      'tenantScope: req.tenantId is missing. This route must run behind the auth middleware.'
    );
  }

  const proxy = Object.create(null);

  // Copy static helper methods we might need
  ['schema', 'modelName', 'collection', 'db'].forEach((k) => {
    if (Model[k] !== undefined) proxy[k] = Model[k];
  });

  // Scope find/update/delete/count methods (they take a filter as 1st arg)
  METHODS_TO_SCOPE.forEach((method) => {
    const original = Model[method];
    if (typeof original !== 'function') return;

    proxy[method] = function (filter = {}, ...rest) {
      const scopedFilter = { ...(filter || {}), tenantId };
      return original.call(Model, scopedFilter, ...rest);
    };
  });

  // ─────────────────────────────────────────────────────────────
  // Redirect ID-based methods to filter-based equivalents with tenantId.
  // Mongoose's `findById(id)` does NOT accept a filter, so it would bypass
  // our tenant check. We remap it to `findOne({ _id: id, tenantId })`,
  // which enforces the tenant boundary.
  // ─────────────────────────────────────────────────────────────
  proxy.findById = function (id, ...rest) {
    return Model.findOne({ _id: id, tenantId }, ...rest);
  };

  proxy.findByIdAndUpdate = function (id, update, ...rest) {
    return Model.findOneAndUpdate({ _id: id, tenantId }, update, ...rest);
  };

  proxy.findByIdAndDelete = function (id, ...rest) {
    return Model.findOneAndDelete({ _id: id, tenantId }, ...rest);
  };

  proxy.findByIdAndRemove = function (id, ...rest) {
    return Model.findOneAndDelete({ _id: id, tenantId }, ...rest);
  };

  // create() — inject tenantId into the doc(s)
  proxy.create = function (docs, ...rest) {
    const inject = (d) => ({ ...(d || {}), tenantId });
    const scoped = Array.isArray(docs) ? docs.map(inject) : inject(docs);
    return Model.create(scoped, ...rest);
  };

  // insertMany() — same as create
  proxy.insertMany = function (docs, ...rest) {
    const arr = Array.isArray(docs) ? docs : [docs];
    const scoped = arr.map((d) => ({ ...(d || {}), tenantId }));
    return Model.insertMany(scoped, ...rest);
  };

  // aggregate() — prepend a $match on tenantId
  proxy.aggregate = function (pipeline = [], ...rest) {
    const scoped = [{ $match: { tenantId } }, ...pipeline];
    return Model.aggregate(scoped, ...rest);
  };

  // Fallback: any other static method passes through
  return new Proxy(proxy, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return Model[prop];
    },
  });
}

module.exports = tenantScope;