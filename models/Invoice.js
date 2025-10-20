const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  hsnCode: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    default: 'PCS'
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerDetails: {
    name: String,
    email: String,
    phone: String,
    gstin: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String
    }
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  cgst: {
    type: Number,
    default: 0
  },
  sgst: {
    type: Number,
    default: 0
  },
  igst: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  roundOff: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentDate: Date,
  paymentMethod: String,
  notes: String,
  terms: String,
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

// Auto-increment invoice number
invoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastInvoice = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    
    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop());
      nextNumber = lastNumber + 1;
    }
    
    this.invoiceNumber = `INV-${currentYear}${currentMonth}-${String(nextNumber).padStart(4, '0')}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);