require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ✅ Fix: Use correct path - 'model' not 'models'
const User = require('../models/User');
const Customer = require('../models/Customer');
const Package = require('../models/Package');
const Area = require('../models/Area');
const Dealer = require('../models/Dealer');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');
const Staff = require('../models/Staff');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clear existing data
    await User.deleteMany();
    await Customer.deleteMany();
    await Package.deleteMany();
    await Area.deleteMany();
    await Dealer.deleteMany();
    await Bill.deleteMany();
    await Payment.deleteMany();
    await Purchase.deleteMany();
    await Staff.deleteMany();

    console.log('🗑️ Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@cable.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });

    const manager = await User.create({
      name: 'Manager User',
      email: 'manager@cable.com',
      password: await bcrypt.hash('Manager@123', 10),
      role: 'manager',
      isActive: true,
    });

    const cashier = await User.create({
      name: 'Cashier User',
      email: 'cashier@cable.com',
      password: await bcrypt.hash('Cashier@123', 10),
      role: 'cashier',
      isActive: true,
    });

    console.log('👤 Created users');

    // Create packages
    const basic = await Package.create({
      name: 'BASIC',
      sellingPrice: 1200,
      purchasePrice: 800,
      bandwidth: '25 Mbps',
      description: 'Basic internet package for home users',
    });

    const standard = await Package.create({
      name: 'STANDARD',
      sellingPrice: 1500,
      purchasePrice: 950,
      bandwidth: '50 Mbps',
      description: 'Standard package for small businesses',
    });

    const premium = await Package.create({
      name: 'PREMIUM',
      sellingPrice: 1800,
      purchasePrice: 1100,
      bandwidth: '100 Mbps',
      description: 'Premium package for heavy users',
    });

    console.log('📦 Created packages');

    // Create areas
    const gulshan = await Area.create({
      name: 'Gulshan Block 1',
      code: 'GUL-001',
      description: 'Gulshan-e-Iqbal Block 1',
    });

    const modelColony = await Area.create({
      name: 'Model Colony',
      code: 'MOD-001',
      description: 'Model Colony area',
    });

    const greenTown = await Area.create({
      name: 'Green Town',
      code: 'GRN-001',
      description: 'Green Town residential area',
    });

    console.log('🏘️ Created areas');

    // Create customers
    const customers = [
      {
        code: 'LC-0001',
        name: 'Ahmed Khan',
        phone: '0300-1234567',
        address: 'House #12, Gulshan Block 1',
        area: gulshan._id,
        package: standard._id,
        monthlyFee: 1500,
        status: 'active',
        createdBy: admin._id,
      },
      {
        code: 'LC-0002',
        name: 'Ali Raza',
        phone: '0321-7654321',
        address: 'Flat #5, Model Colony',
        area: modelColony._id,
        package: premium._id,
        monthlyFee: 1800,
        status: 'active',
        createdBy: admin._id,
      },
      {
        code: 'LC-0003',
        name: 'Usman Shah',
        phone: '0333-2221110',
        address: 'House #8, Green Town',
        area: greenTown._id,
        package: basic._id,
        monthlyFee: 1200,
        status: 'inactive',
        createdBy: admin._id,
      },
    ];

    const createdCustomers = await Customer.insertMany(customers);
    console.log(`👥 Created ${createdCustomers.length} customers`);

    // Create bills
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const bills = [];
    for (const customer of createdCustomers) {
      const bill = await Bill.create({
        billNo: `B-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        customer: customer._id,
        month: currentMonth,
        year: new Date().getFullYear(),
        totalAmount: customer.monthlyFee || 1200,
        dueDate: new Date(new Date().setDate(28)),
      });
      bills.push(bill);
    }
    console.log(`📄 Created ${bills.length} bills`);

    // Create payments
    for (const customer of createdCustomers) {
      const bill = bills.find(b => b.customer.toString() === customer._id.toString());
      if (bill && customer.status === 'active') {
        await Payment.create({
          receiptNo: `RC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          customer: customer._id,
          bill: bill._id,
          amount: Math.floor(Math.random() * 1500) + 1000,
          month: currentMonth,
          paymentMethod: ['cash', 'jazzcash', 'easypaisa'][Math.floor(Math.random() * 3)],
          receivedBy: admin._id,
        });
      }
    }
    console.log('💰 Created payments');

    // Create dealers
    await Dealer.create([
      {
        dealerId: 'DLR-001',
        name: 'City Cable Dealer',
        cellNo: '0300-1112233',
        area: gulshan._id,
        address: 'Gulshan Block 1',
        remarks: 'Main area dealer',
        openingBalance: 20000,
        currentBalance: 20000,
        createdBy: admin._id,
      },
      {
        dealerId: 'DLR-002',
        name: 'Star Network',
        cellNo: '0321-4455667',
        area: modelColony._id,
        address: 'Model Colony',
        remarks: 'Active recovery dealer',
        openingBalance: 15000,
        currentBalance: 15000,
        createdBy: admin._id,
      },
      {
        dealerId: 'DLR-003',
        name: 'Pak Vision Cable',
        cellNo: '0333-7788990',
        area: greenTown._id,
        address: 'Green Town',
        remarks: 'Fiber linked dealer',
        openingBalance: 5000,
        currentBalance: 5000,
        createdBy: admin._id,
      },
    ]);
    console.log('🚚 Created dealers');

    // Create purchases
    await Purchase.create([
      {
        purchaseNo: 'PUR-001',
        vendor: 'Network Traders',
        item: '24 Core Fiber Cable',
        quantity: 2,
        unit: 'km',
        amount: 120000,
        status: 'paid',
        paidAmount: 120000,
        createdBy: admin._id,
        remarks: 'Main fiber line installation',
      },
      {
        purchaseNo: 'PUR-002',
        vendor: 'Tech Vision',
        item: 'ONU Devices',
        quantity: 20,
        unit: 'units',
        amount: 78000,
        status: 'partial',
        paidAmount: 40000,
        createdBy: admin._id,
        remarks: 'For new connections',
      },
    ]);
    console.log('🛒 Created purchases');

    // Create staff
    await Staff.create([
      {
        staffId: 'ST-001',
        name: 'Recovery Operator',
        phone: '0300-5551234',
        designation: 'Collector',
        assignedArea: gulshan._id,
        isActive: true,
      },
      {
        staffId: 'ST-002',
        name: 'Kamran Ali',
        phone: '0321-6644221',
        designation: 'Technician',
        assignedArea: modelColony._id,
        isActive: true,
      },
    ]);
    console.log('👤 Created staff');

    console.log('✅ Database seeded successfully!');
    console.log(`📧 Admin email: admin@cable.com`);
    console.log(`🔑 Admin password: Admin@123`);
    console.log(`📧 Manager email: manager@cable.com`);
    console.log(`🔑 Manager password: Manager@123`);
    console.log(`📧 Cashier email: cashier@cable.com`);
    console.log(`🔑 Cashier password: Cashier@123`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Seed error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

seedDatabase();