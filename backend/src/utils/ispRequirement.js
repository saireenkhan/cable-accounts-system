const ISPModel = require('../models/ISP');
const tenantScope = require('../utils/tenantScope');

/** ISP associations are required only when this tenant has an ISP. */
async function ispSelectionRequired(req) {
  const ISP = tenantScope(ISPModel, req);
  return Boolean(await ISP.exists({}));
}

module.exports = { ispSelectionRequired };
