
require('dotenv').config();

const mongoose = require('mongoose');
const readline = require('readline');
const connectDB = require('../config/database');
const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createMaster() {
  try {
    console.log('\nSMART RECOVERY - MASTER ACCOUNT SETUP\n');

    const name = (await ask('Master Name: ')).trim();

    const email = (
      await ask('Master Email / Login ID: ')
    ).trim().toLowerCase();

    const password = await ask('Master Password: ');

    if (!name || !email || password.length < 12) {
      throw new Error(
        'Name, email and password of at least 12 characters are required.'
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        'An account with this email already exists.'
      );
    }

    const master = await User.create({
      name,
      email,
      password,
      role: 'superadmin',
      tenantId: null,
      isActive: true,
    });

    console.log('\nMaster account created successfully!');
    console.log('Master ID:', master._id.toString());
    console.log('Master Email:', master.email);
    console.log('Role:', master.role);
    console.log('Tenant:', master.tenantId);
  } catch (error) {
    console.error('\nError:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createMaster();
