const ISP = require('../models/ISP');

// Called by customer and partner bulk upload controllers.
// Requires authentication middleware to populate req.tenantId.
module.exports = async function resolveUploadArea(req, AreaModel) {
  const tenantId = req.tenantId;
  if (!tenantId) return { ok: false, message: 'Tenant not found' };

  const selectedArea = String(req.body.area || '').trim();
  const selectedISP = String(req.body.isp || '').trim();
  if (!selectedArea) return { ok: false, message: 'Please select an area' };

  const isps = await ISP.find({ tenantId }, { name: 1 }).lean();
  const ispEnabled = isps.length > 0;
  let ispName = '';
  if (ispEnabled) {
    if (!selectedISP) return { ok: false, message: 'Please select an ISP' };
    const matched = isps.find(x => x.name.toLowerCase() === selectedISP.toLowerCase());
    if (!matched) return { ok: false, message: 'Invalid ISP selection' };
    ispName = matched.name;
  } else if (selectedISP) {
    return { ok: false, message: 'No ISPs configured; do not send ISP' };
  }

  const filter = { tenantId, name: selectedArea };
  if (ispEnabled) filter.isp = ispName; // MongoDB matches an array element
  const area = await AreaModel.findOne(filter).lean();
  if (!area) return { ok: false, message: 'Selected area is not available for this ISP' };
  return { ok: true, ispEnabled, ispName, areaName: area.name };
};
