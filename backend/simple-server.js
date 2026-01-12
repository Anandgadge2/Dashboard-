const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Simple schemas for testing
const CompanySchema = new mongoose.Schema({
  companyId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  companyType: { type: String, required: true, enum: ['GOVERNMENT', 'GOV_GRIEVANCE', 'SERVICE_BOOKING', 'SURVEY_FEEDBACK', 'LEAD_COLLECTION', 'CUSTOM_ENTERPRISE'] },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  address: String,
  enabledModules: [String],
  theme: {
    primaryColor: { type: String, default: '#0f4c81' },
    secondaryColor: { type: String, default: '#1a73e8' }
  },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, required: true, enum: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEPARTMENT_ADMIN', 'OPERATOR', 'ANALYTICS_VIEWER'] },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save hooks
CompanySchema.pre('save', async function(next) {
  if (this.isNew && !this.companyId) {
    const count = await mongoose.model('Company').countDocuments();
    this.companyId = `CMP${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

UserSchema.pre('save', async function(next) {
  if (this.isNew && !this.userId) {
    const count = await mongoose.model('User').countDocuments();
    this.userId = `USER${String(count + 1).padStart(6, '0')}`;
  }
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

const Company = mongoose.model('Company', CompanySchema);
const User = mongoose.model('User', UserSchema);

// Simple auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  // For now, just accept any token (remove this in production)
  next();
};

const requireSuperAdmin = (req, res, next) => {
  // For now, just pass through (remove this in production)
  next();
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/companies', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    console.log('Company creation request:', req.body);
    
    const { 
      name, 
      companyType, 
      contactEmail, 
      contactPhone, 
      address, 
      enabledModules,
      theme,
      admin 
    } = req.body;

    // Validation
    if (!name || !companyType || !contactEmail || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required company fields'
      });
    }

    console.log('Creating company...');
    
    // Create company
    const company = await Company.create({
      name,
      companyType,
      contactEmail,
      contactPhone,
      address,
      enabledModules: enabledModules || [],
      theme: theme || {
        primaryColor: '#0f4c81',
        secondaryColor: '#1a73e8'
      },
      isActive: true,
      isSuspended: false,
      isDeleted: false
    });

    console.log('Company created:', company._id);

    // Create admin if provided
    let adminUser = null;
    if (admin && admin.email && admin.password && admin.firstName && admin.lastName) {
      console.log('Creating admin user...');
      
      adminUser = await User.create({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: admin.password,
        phone: admin.phone || contactPhone,
        role: 'COMPANY_ADMIN',
        companyId: company._id,
        isActive: true,
        isEmailVerified: true
      });

      console.log('Admin user created:', adminUser._id);
    }

    res.status(201).json({
      success: true,
      message: 'Company created successfully' + (adminUser ? ' with admin user' : ''),
      data: { 
        company,
        admin: adminUser ? {
          id: adminUser._id,
          userId: adminUser.userId,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          email: adminUser.email,
          role: adminUser.role,
          companyId: adminUser.companyId
        } : null
      }
    });

  } catch (error) {
    console.error('Company creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    } else {
      console.log('⚠️  No MONGODB_URI provided, running without database');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Simple server running on port ${PORT}`);
      console.log(`📝 Health: http://localhost:${PORT}/health`);
      console.log(`🏢 Companies: http://localhost:${PORT}/api/companies`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
}

start();
