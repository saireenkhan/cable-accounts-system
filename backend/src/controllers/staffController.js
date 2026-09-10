const Staff = require('../models/Staff');
const Area = require('../models/Area');
const logger = require('../utils/logger');

const generateStaffId = async () => {
  const count = await Staff.countDocuments();
  return `ST-${String(count + 1).padStart(3, '0')}`;
};

exports.getStaff = async (req, res) => {
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

exports.createStaff = async (req, res) => {
  try {
    const { 
      name, phone, email, cnic, designation, salary, 
      joiningDate, address, assignedArea, isActive, remarks 
    } = req.body;

    console.log('📝 Creating staff with data:', req.body);

    // ✅ Find area by name
    let areaDoc = null;
    if (assignedArea) {
      areaDoc = await Area.findOne({ name: assignedArea });
      if (!areaDoc) {
        areaDoc = await Area.create({
          name: assignedArea,
          code: assignedArea.substring(0, 3).toUpperCase(),
          isActive: true
        });
        console.log('✅ Created new area:', areaDoc);
      }
    }

    const staffId = await generateStaffId();

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

    const populatedStaff = await Staff.findById(staff._id)
      .populate('assignedArea', 'name');

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

exports.updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    res.json({ success: true, staff });
  } catch (error) {
    logger.error(`Update staff error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteStaff = async (req, res) => {
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