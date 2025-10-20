const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  hsnCode: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    default: 'PCS'
  },
  pricing: {
    costPrice: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    mrp: {
      type: Number,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  tax: {
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    taxType: {
      type: String,
      enum: ['inclusive', 'exclusive'],
      default: 'exclusive'
    }
  },
  inventory: {
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    minStock: {
      type: Number,
      default: 10,
      min: 0
    },
    maxStock: {
      type: Number,
      default: 1000,
      min: 0
    },
    reorderLevel: {
      type: Number,
      default: 20,
      min: 0
    },
    location: {
      type: String,
      trim: true
    }
  },
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  images: [{
    url: String,
    alt: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isTrackInventory: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-generate SKU if not provided
productSchema.pre('save', function(next) {
  if (this.isNew && !this.sku) {
    const timestamp = Date.now().toString().slice(-6);
    const namePrefix = this.name.substring(0, 3).toUpperCase();
    this.sku = `${namePrefix}${timestamp}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Stock Movement Schema
const stockMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['purchase', 'sale', 'return', 'damage', 'adjustment', 'transfer'],
    required: true
  },
  reference: {
    type: String, // Invoice number, PO number, etc.
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = {
  Product: mongoose.model('Product', productSchema),
  StockMovement: mongoose.model('StockMovement', stockMovementSchema),
  Category: mongoose.model('Category', categorySchema)
};