const express = require('express');
const Invoice = require('../models/Invoice');
const { Product } = require('../models/Product');
const { tenantMiddleware } = require('../utils/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Apply middleware
router.use(tenantMiddleware);
router.use(auth);

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const TenantInvoice = req.tenantDB.model('Invoice', Invoice.schema);
    
    let query = {};
    if (status) query.status = status;

    const invoices = await TenantInvoice.find(query)
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TenantInvoice.countDocuments(query);

    res.json({
      invoices,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Error fetching invoices' });
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  try {
    const TenantInvoice = req.tenantDB.model('Invoice', Invoice.schema);
    const TenantProduct = req.tenantDB.model('Product', Product.schema);
    
    const invoiceData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Calculate GST and totals
    let subtotal = 0;
    let totalTax = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (let item of invoiceData.items) {
      const amount = item.quantity * item.rate - (item.discount || 0);
      const taxAmount = (amount * item.taxRate) / 100;
      
      item.amount = amount;
      item.taxAmount = taxAmount;
      
      subtotal += amount;
      totalTax += taxAmount;

      // Determine CGST/SGST vs IGST based on customer state
      if (invoiceData.customerDetails.address.state === 'Same State') {
        cgst += taxAmount / 2;
        sgst += taxAmount / 2;
      } else {
        igst += taxAmount;
      }
    }

    invoiceData.subtotal = subtotal;
    invoiceData.totalTax = totalTax;
    invoiceData.cgst = cgst;
    invoiceData.sgst = sgst;
    invoiceData.igst = igst;
    invoiceData.totalAmount = subtotal + totalTax;
    invoiceData.finalAmount = Math.round(invoiceData.totalAmount);
    invoiceData.roundOff = invoiceData.finalAmount - invoiceData.totalAmount;

    const invoice = new TenantInvoice(invoiceData);
    await invoice.save();

    // Update inventory
    for (let item of invoiceData.items) {
      if (item.productId) {
        await TenantProduct.findByIdAndUpdate(
          item.productId,
          { $inc: { 'inventory.currentStock': -item.quantity } }
        );
      }
    }

    res.status(201).json({ message: 'Invoice created successfully', invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Error creating invoice' });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const TenantInvoice = req.tenantDB.model('Invoice', Invoice.schema);
    
    const invoice = await TenantInvoice.findById(req.params.id)
      .populate('customerId', 'name email phone gstin address');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Error fetching invoice' });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const TenantInvoice = req.tenantDB.model('Invoice', Invoice.schema);
    
    const invoice = await TenantInvoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Error updating invoice' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const TenantInvoice = req.tenantDB.model('Invoice', Invoice.schema);
    
    const invoice = await TenantInvoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ message: 'Error deleting invoice' });
  }
});

module.exports = router;