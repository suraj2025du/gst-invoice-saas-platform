const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Tenant, User } = require('../models');
const { getTenantDB } = require('../utils/database');
const router = express.Router();

// Register new tenant (signup)
router.post('/register', async (req, res) => {
  try {
    const {
      subdomain,
      companyName,
      ownerName,
      email,
      phone,
      password,
      gstin,
      address
    } = req.body;

    // Validate required fields
    if (!subdomain || !companyName || !ownerName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if subdomain already exists
    const existingTenant = await Tenant.findOne({ 
      $or: [{ subdomain }, { email }] 
    });
    
    if (existingTenant) {
      return res.status(400).json({ 
        message: 'Subdomain or email already exists' 
      });
    }

    // Create new tenant
    const tenant = new Tenant({
      subdomain: subdomain.toLowerCase(),
      companyName,
      ownerName,
      email: email.toLowerCase(),
      phone,
      gstin,
      address
    });

    await tenant.save();

    // Create tenant database and owner user
    const tenantDB = getTenantDB(subdomain);
    const TenantUser = tenantDB.model('User', User.schema);

    const hashedPassword = await bcrypt.hash(password, 12);
    const ownerUser = new TenantUser({
      name: ownerName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'owner',
      permissions: ['invoices', 'inventory', 'customers', 'reports', 'settings']
    });

    await ownerUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: ownerUser._id, 
        tenantId: subdomain,
        role: 'owner'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Tenant registered successfully',
      token,
      user: {
        id: ownerUser._id,
        name: ownerUser.name,
        email: ownerUser.email,
        role: ownerUser.role
      },
      tenant: {
        subdomain: tenant.subdomain,
        companyName: tenant.companyName,
        subscription: tenant.subscription
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, subdomain } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Determine tenant from subdomain or request
    let tenantId = subdomain || req.tenantId;
    
    if (!tenantId || tenantId === 'main') {
      return res.status(400).json({ message: 'Invalid tenant' });
    }

    // Get tenant info
    const tenant = await Tenant.findOne({ subdomain: tenantId });
    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ message: 'Tenant not found or inactive' });
    }

    // Check subscription status
    if (tenant.subscription.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Please contact support.' });
    }

    // Get user from tenant database
    const tenantDB = getTenantDB(tenantId);
    const TenantUser = tenantDB.model('User', User.schema);
    
    const user = await TenantUser.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        tenantId: tenantId,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      tenant: {
        subdomain: tenant.subdomain,
        companyName: tenant.companyName,
        subscription: tenant.subscription
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get tenant info
    const tenant = await Tenant.findOne({ subdomain: decoded.tenantId });
    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Get user info
    const tenantDB = getTenantDB(decoded.tenantId);
    const TenantUser = tenantDB.model('User', User.schema);
    const user = await TenantUser.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      tenant: {
        subdomain: tenant.subdomain,
        companyName: tenant.companyName,
        subscription: tenant.subscription
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;