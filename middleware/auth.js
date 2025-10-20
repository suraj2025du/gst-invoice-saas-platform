const jwt = require('jsonwebtoken');
const { Tenant } = require('../models');
const { getTenantDB } = require('../utils/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get tenant info
    const tenant = await Tenant.findOne({ subdomain: decoded.tenantId });
    if (!tenant || !tenant.isActive) {
      return res.status(403).json({ message: 'Tenant not found or inactive' });
    }

    // Check subscription status
    if (tenant.subscription.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Please contact support.' });
    }

    // Get user from tenant database
    const tenantDB = getTenantDB(decoded.tenantId);
    const User = tenantDB.model('User', require('../models').User.schema);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(403).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    req.tenant = tenant;
    req.tenantDB = tenantDB;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Permission middleware
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission) && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Role middleware
const hasRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient role permissions' });
    }
    next();
  };
};

module.exports = { auth, hasPermission, hasRole };