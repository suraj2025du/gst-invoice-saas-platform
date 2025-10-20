const mongoose = require('mongoose');

// Store tenant database connections
const tenantConnections = new Map();

// Get or create tenant database connection
const getTenantDB = (tenantId) => {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  // Return existing connection if available
  if (tenantConnections.has(tenantId)) {
    return tenantConnections.get(tenantId);
  }

  // Create new connection for tenant
  const dbName = `tenant_${tenantId}`;
  const connectionString = process.env.MONGODB_URI.replace(/\/[^\/]*$/, `/${dbName}`);
  
  const connection = mongoose.createConnection(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Store connection
  tenantConnections.set(tenantId, connection);

  // Handle connection events
  connection.on('connected', () => {
    console.log(`✅ Tenant DB connected: ${dbName}`);
  });

  connection.on('error', (err) => {
    console.error(`❌ Tenant DB error for ${dbName}:`, err);
  });

  connection.on('disconnected', () => {
    console.log(`🔌 Tenant DB disconnected: ${dbName}`);
    tenantConnections.delete(tenantId);
  });

  return connection;
};

// Close tenant database connection
const closeTenantDB = (tenantId) => {
  if (tenantConnections.has(tenantId)) {
    const connection = tenantConnections.get(tenantId);
    connection.close();
    tenantConnections.delete(tenantId);
  }
};

// Close all tenant connections
const closeAllTenantDBs = async () => {
  const promises = Array.from(tenantConnections.values()).map(conn => conn.close());
  await Promise.all(promises);
  tenantConnections.clear();
};

// Get tenant model
const getTenantModel = (tenantId, modelName, schema) => {
  const connection = getTenantDB(tenantId);
  return connection.model(modelName, schema);
};

// Middleware to inject tenant database
const tenantMiddleware = (req, res, next) => {
  if (req.tenantId && req.tenantId !== 'main') {
    try {
      req.tenantDB = getTenantDB(req.tenantId);
    } catch (error) {
      return res.status(500).json({ message: 'Database connection error' });
    }
  }
  next();
};

// Database health check
const checkTenantDBHealth = async (tenantId) => {
  try {
    const connection = getTenantDB(tenantId);
    const isConnected = connection.readyState === 1;
    
    if (isConnected) {
      // Test with a simple query
      await connection.db.admin().ping();
      return { status: 'healthy', connected: true };
    } else {
      return { status: 'unhealthy', connected: false };
    }
  } catch (error) {
    return { status: 'error', connected: false, error: error.message };
  }
};

// Backup tenant database
const backupTenantDB = async (tenantId) => {
  try {
    const connection = getTenantDB(tenantId);
    const collections = await connection.db.listCollections().toArray();
    
    const backup = {
      tenantId,
      timestamp: new Date().toISOString(),
      collections: {}
    };

    for (const collection of collections) {
      const collectionName = collection.name;
      const data = await connection.db.collection(collectionName).find({}).toArray();
      backup.collections[collectionName] = data;
    }

    return backup;
  } catch (error) {
    throw new Error(`Backup failed for tenant ${tenantId}: ${error.message}`);
  }
};

// Restore tenant database
const restoreTenantDB = async (tenantId, backupData) => {
  try {
    const connection = getTenantDB(tenantId);
    
    // Clear existing data
    const collections = await connection.db.listCollections().toArray();
    for (const collection of collections) {
      await connection.db.collection(collection.name).deleteMany({});
    }

    // Restore data
    for (const [collectionName, data] of Object.entries(backupData.collections)) {
      if (data.length > 0) {
        await connection.db.collection(collectionName).insertMany(data);
      }
    }

    return { success: true, message: 'Database restored successfully' };
  } catch (error) {
    throw new Error(`Restore failed for tenant ${tenantId}: ${error.message}`);
  }
};

// Get database statistics
const getTenantDBStats = async (tenantId) => {
  try {
    const connection = getTenantDB(tenantId);
    const stats = await connection.db.stats();
    
    return {
      tenantId,
      collections: stats.collections,
      documents: stats.objects,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize
    };
  } catch (error) {
    throw new Error(`Stats failed for tenant ${tenantId}: ${error.message}`);
  }
};

module.exports = {
  getTenantDB,
  closeTenantDB,
  closeAllTenantDBs,
  getTenantModel,
  tenantMiddleware,
  checkTenantDBHealth,
  backupTenantDB,
  restoreTenantDB,
  getTenantDBStats
};