# 🚀 Hostinger Deployment Guide

## Complete Setup Instructions for GST Invoice SaaS Platform

### 📋 Prerequisites
- Hostinger Business Plan (with Node.js support)
- MongoDB Atlas account (free tier available)
- Domain name configured

### 🔧 Step 1: Hostinger Setup

1. **Login to Hostinger Control Panel**
2. **Go to Advanced → Node.js**
3. **Create New Node.js App:**
   - App Name: `gst-invoice-saas`
   - Node.js Version: `18.x` or higher
   - Startup File: `server.js`

### 🗄️ Step 2: Database Setup

1. **Create MongoDB Atlas Account:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create free cluster
   - Get connection string

2. **Database Configuration:**
   ```
   Main Database: gst_invoice_main
   Tenant Databases: tenant_[subdomain]
   ```

### 📁 Step 3: File Upload

1. **Upload all files to your Hostinger app directory**
2. **Install dependencies:**
   ```bash
   npm install
   ```

### ⚙️ Step 4: Environment Configuration

Create `.env` file with your settings:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
FRONTEND_URL=https://yourdomain.com

# Email Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Razorpay Settings
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Admin Settings
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your_admin_password
```

### 🌐 Step 5: Domain Configuration

1. **Main Domain:** `yourdomain.com` → Landing page
2. **Admin Panel:** `admin.yourdomain.com` → Super admin dashboard
3. **Customer Subdomains:** `customer1.yourdomain.com` → Customer portal

**DNS Settings:**
```
A Record: @ → Your Hostinger IP
CNAME: * → yourdomain.com
CNAME: admin → yourdomain.com
```

### 🚀 Step 6: Start Application

1. **In Hostinger Node.js panel:**
   - Click "Start Application"
   - Monitor logs for any errors

2. **Test URLs:**
   - `https://yourdomain.com/health` → Should return OK
   - `https://admin.yourdomain.com` → Admin panel
   - `https://yourdomain.com/api/auth/register` → Registration API

### 🔐 Step 7: Security Setup

1. **SSL Certificate:** Enable in Hostinger panel
2. **Firewall:** Configure if available
3. **Backup:** Set up automatic backups

### 📊 Step 8: Admin Access

1. **Access admin panel:** `https://admin.yourdomain.com`
2. **Default credentials:** Use SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD
3. **First login:** Change default password immediately

### 🧪 Step 9: Testing

**Test Registration:**
```bash
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "testcompany",
    "companyName": "Test Company",
    "ownerName": "Test Owner",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "password123"
  }'
```

**Test Customer Access:**
- Visit: `https://testcompany.yourdomain.com`
- Login with test credentials

### 🔧 Troubleshooting

**Common Issues:**

1. **App won't start:**
   - Check Node.js version (18.x+)
   - Verify all dependencies installed
   - Check environment variables

2. **Database connection failed:**
   - Verify MongoDB Atlas connection string
   - Check IP whitelist in Atlas
   - Ensure network access configured

3. **Subdomain not working:**
   - Verify DNS wildcard record
   - Check domain propagation
   - Clear browser cache

4. **Payment issues:**
   - Verify Razorpay credentials
   - Check webhook URLs
   - Test in sandbox mode first

### 📈 Performance Optimization

1. **Enable compression** (already included)
2. **Set up CDN** through Hostinger
3. **Database indexing** (auto-configured)
4. **Caching** (Redis optional)

### 🔄 Updates & Maintenance

1. **Regular backups:** Automated daily
2. **Security updates:** Monitor dependencies
3. **Performance monitoring:** Built-in health checks
4. **Log monitoring:** Check application logs

### 💰 Monetization Setup

1. **Razorpay Integration:** Complete
2. **Subscription Plans:** Pre-configured
3. **Billing Automation:** Automated
4. **Invoice Generation:** Ready

### 📞 Support

**If you face any issues:**
1. Check application logs in Hostinger panel
2. Verify environment variables
3. Test database connectivity
4. Contact for technical support

---

## 🎯 Ready to Launch!

Your GST Invoice SaaS platform is now ready for production use. Start onboarding customers and generating revenue!

**Next Steps:**
1. Marketing and customer acquisition
2. Customer support setup
3. Feature enhancements based on feedback
4. Scale infrastructure as needed