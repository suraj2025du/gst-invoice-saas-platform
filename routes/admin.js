const express = require('express');
const { Tenant } = require('../models');
const { getTenantDB } = require('../utils/database');
const router = express.Router();

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ isActive: true });
    const trialTenants = await Tenant.countDocuments({ 'subscription.status': 'trial' });
    const paidTenants = await Tenant.countDocuments({ 'subscription.status': 'active' });
    
    // Calculate monthly revenue
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const monthlyRevenue = await Tenant.aggregate([
      {
        $match: {
          'subscription.status': 'active',
          'subscription.lastPaymentDate': { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$subscription.plan', 'basic'] }, then: 299 },
                  { case: { $eq: ['$subscription.plan', 'pro'] }, then: 599 },
                  { case: { $eq: ['$subscription.plan', 'enterprise'] }, then: 999 }
                ],
                default: 0
              }
            }
          }
        }
      }
    ]);

    res.json({
      stats: {
        totalTenants,
        activeTenants,
        trialTenants,
        paidTenants,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

// Get all tenants
router.get('/tenants', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tenants = await Tenant.find()
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Tenant.countDocuments();

    res.json({
      tenants,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Error fetching tenants' });
  }
});

// Get specific tenant details
router.get('/tenants/:id', adminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Get tenant database stats
    const tenantDB = getTenantDB(tenant.subdomain);
    const User = tenantDB.model('User', require('../models').User.schema);
    const Invoice = tenantDB.model('Invoice', require('../models/Invoice').schema);
    const Product = tenantDB.model('Product', require('../models/Product').Product.schema);

    const userCount = await User.countDocuments();
    const invoiceCount = await Invoice.countDocuments();
    const productCount = await Product.countDocuments();

    res.json({
      tenant,
      stats: {
        users: userCount,
        invoices: invoiceCount,
        products: productCount
      }
    });
  } catch (error) {
    console.error('Get tenant details error:', error);
    res.status(500).json({ message: 'Error fetching tenant details' });
  }
});

// Update tenant status
router.patch('/tenants/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json({ message: 'Tenant status updated', tenant });
  } catch (error) {
    console.error('Update tenant status error:', error);
    res.status(500).json({ message: 'Error updating tenant status' });
  }
});

// Update subscription
router.patch('/tenants/:id/subscription', adminAuth, async (req, res) => {
  try {
    const { plan, status, endDate } = req.body;
    
    const updateData = {};
    if (plan) updateData['subscription.plan'] = plan;
    if (status) updateData['subscription.status'] = status;
    if (endDate) updateData['subscription.endDate'] = new Date(endDate);

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json({ message: 'Subscription updated', tenant });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Error updating subscription' });
  }
});

// Get system health
router.get('/health', adminAuth, async (req, res) => {
  try {
    const dbStatus = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Health check failed' });
  }
});

module.exports = router;