import mongoose from 'mongoose';
import Company from '../models/Company';
import Department from '../models/Department';
import User from '../models/User';
import { UserRole } from '../config/constants';
import bcrypt from 'bcryptjs';

const seedUsers = async () => {
  try {
    console.log('🌱 Seeding users for ZP Amaravati...');

    // Connect to database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard');
    }

    // Find ZP Amaravati company
    const zpCompany = await Company.findOne({ name: 'ZP Amaravati' });
    if (!zpCompany) {
      console.log('❌ ZP Amaravati company not found. Please run seed:zpamaravati first.');
      return;
    }

    console.log('✅ Found ZP Amaravati company:', zpCompany.companyId);

    // Get departments
    const departments = await Department.find({ companyId: zpCompany._id });
    console.log(`✅ Found ${departments.length} departments`);

    // Create users for different roles
    const users = [
      // Company Admin
      {
        firstName: 'Anand',
        lastName: 'Jadhav',
        email: 'ceo@zpamaravati.gov.in',
        password: 'Admin@123',
        phone: '+91-9876543200',
        role: UserRole.COMPANY_ADMIN,
        companyId: zpCompany._id,
        departmentId: null
      },
      // Department Admins
      {
        firstName: 'Ramesh',
        lastName: 'Kumar',
        email: 'revenue.admin@zpamaravati.gov.in',
        password: 'Admin@123',
        phone: '+91-9876543210',
        role: UserRole.DEPARTMENT_ADMIN,
        companyId: zpCompany._id,
        departmentId: departments.find(d => d.name === 'Revenue Department')?._id || null
      },
      {
        firstName: 'Sunita',
        lastName: 'Patil',
        email: 'health.admin@zpamaravati.gov.in',
        password: 'Admin@123',
        phone: '+91-9876543211',
        role: UserRole.DEPARTMENT_ADMIN,
        companyId: zpCompany._id,
        departmentId: departments.find(d => d.name === 'Health Department')?._id || null
      },
      {
        firstName: 'Vijay',
        lastName: 'Sharma',
        email: 'water.admin@zpamaravati.gov.in',
        password: 'Admin@123',
        phone: '+91-9876543212',
        role: UserRole.DEPARTMENT_ADMIN,
        companyId: zpCompany._id,
        departmentId: departments.find(d => d.name === 'Water Supply Department')?._id || null
      },
      // Regular Operators
      {
        firstName: 'Rajesh',
        lastName: 'Singh',
        email: 'rajesh.singh@zpamaravati.gov.in',
        password: 'Operator@123',
        phone: '+91-9876543213',
        role: UserRole.OPERATOR,
        companyId: zpCompany._id,
        departmentId: departments.find(d => d.name === 'Revenue Department')?._id || null
      },
      {
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@zpamaravati.gov.in',
        password: 'Operator@123',
        phone: '+91-9876543214',
        role: UserRole.OPERATOR,
        companyId: zpCompany._id,
        departmentId: departments.find(d => d.name === 'Health Department')?._id || null
      },
      {
        firstName: 'Amit',
        lastName: 'Patel',
        email: 'amit.patel@zpamaravati.gov.in',
        password: 'Operator@123',
        phone: '+91-9876543215',
        role: UserRole.OPERATOR,
        companyId: zpCompany._id,
        departmentId: departments.find(d => d.name === 'Water Supply Department')?._id || null
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        isActive: true,
        isEmailVerified: true
      });
      
      createdUsers.push(user);
      console.log(`✅ User created: ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    }

    console.log('\n🎉 User seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('\n🔐 Company Admin:');
    console.log('   ceo@zpamaravati.gov.in / Admin@123');
    console.log('\n🔐 Department Admins:');
    console.log('   revenue.admin@zpamaravati.gov.in / Admin@123');
    console.log('   health.admin@zpamaravati.gov.in / Admin@123');
    console.log('   water.admin@zpamaravati.gov.in / Admin@123');
    console.log('\n🔐 Operators:');
    console.log('   rajesh.singh@zpamaravati.gov.in / Operator@123');
    console.log('   priya.sharma@zpamaravati.gov.in / Operator@123');
    console.log('   amit.patel@zpamaravati.gov.in / Operator@123');

  } catch (error) {
    console.error('❌ User seeding failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

// Run the seed function
if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedUsers;
