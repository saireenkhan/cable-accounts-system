const StaffModel = require('../models/Staff');
const AreaModel = require('../models/Area');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// ============================================================
// GENERATE STAFF ID
// Accepts the tenant-scoped Staff model as a parameter.
// ============================================================
const generateStaffId = async (Staff) => {
  const count = await Staff.countDocuments();
  return `ST-${String(count + 1).padStart(3, '0')}`;
};

// ============================================================
// GET ALL STAFF
// ============================================================
exports.getStaff = async (req, res) => {
  const Staff = tenantScope(StaffModel, req);

  try {
    const { search, status } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.isActive = status === 'active';

    const staff = await Staff.find(filter)
      .populate('assignedArea', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, staff });
  } catch (error) {
    logger.error(`Get staff error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================================
// GET SINGLE STAFF
// ============================================================
exports.getStaffById = async (req, res) => {
  const Staff = tenantScope(StaffModel, req);

  try {
    const staff = await Staff.findById(req.params.id).populate(
      'assignedArea',
      'name'
    );

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json({ success: true, staff });
  } catch (error) {
    logger.error(`Get staff by id error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================================
// CREATE STAFF
// ============================================================
exports.createStaff = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  const Staff = tenantScope(StaffModel, req);

  try {
    const {
      name,
      phone,
      email,
      cnic,
      designation,
      salary,
      joiningDate,
      address,
      assignedArea,
      isActive,
      remarks,
    } = req.body;

    console.log('📝 Creating staff with data:', req.body);

    // Generate staff ID first so a failure here does not
    // leave an orphaned area record behind.
    const staffId = await generateStaffId(Staff);

    // Resolve or create the assigned area
    let areaDoc = null;
    if (assignedArea) {
      areaDoc = await Area.findOne({ name: assignedArea });

      if (!areaDoc) {
        areaDoc = await Area.create({
          name: assignedArea,
          code: assignedArea.substring(0, 3).toUpperCase(),
          isActive: true,
        });
        console.log('✅ Created new area:', areaDoc);
      }
    }

    const staff = await Staff.create({
      staffId,
      name,
      phone,
      email: email || '',
      cnic: cnic || '',
      designation,
      salary: parseFloat(salary) || 0,
      joiningDate: joiningDate || new Date(),
      address: address || '',
      assignedArea: areaDoc ? areaDoc._id : null,
      isActive: isActive !== undefined ? isActive : true,
      remarks: remarks || '',
    });

    const populatedStaff = await Staff.findById(staff._id).populate(
      'assignedArea',
      'name'
    );

    console.log('✅ Staff created successfully:', populatedStaff.staffId);

    res.status(201).json({
      success: true,
      staff: populatedStaff,
      message: 'Staff created successfully',
    });
  } catch (error) {
    console.error('❌ Create staff error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// UPDATE STAFF
// ============================================================
exports.updateStaff = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  const Staff = tenantScope(StaffModel, req);

  try {
    const {
      name,
      phone,
      email,
      cnic,
      designation,
      salary,
      joiningDate,
      address,
      assignedArea,
      isActive,
      remarks,
    } = req.body;

    console.log('📝 Updating staff:', req.params.id, req.body);

    // Resolve or create the assigned area
    let areaDoc = null;
    if (assignedArea) {
      areaDoc = await Area.findOne({ name: assignedArea });

      if (!areaDoc) {
        areaDoc = await Area.create({
          name: assignedArea,
          code: assignedArea.substring(0, 3).toUpperCase(),
          isActive: true,
        });
        console.log('✅ Created new area:', areaDoc);
      }
    }

    const update = {
      name,
      phone,
      email: email || '',
      cnic: cnic || '',
      designation,
      salary: parseFloat(salary) || 0,
      joiningDate: joiningDate || new Date(),
      address: address || '',
      assignedArea: areaDoc ? areaDoc._id : null,
      isActive: isActive !== undefined ? isActive : true,
      remarks: remarks || '',
    };

    const staff = await Staff.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate('assignedArea', 'name');

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    console.log('✅ Staff updated:', staff.staffId);

    res.json({
      success: true,
      staff,
      message: 'Staff updated successfully',
    });
  } catch (error) {
    console.error('❌ Update staff error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE STAFF
// ============================================================
exports.deleteStaff = async (req, res) => {
  const Staff = tenantScope(StaffModel, req);

  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deleted successfully' });
  } catch (error) {
    logger.error(`Delete staff error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};