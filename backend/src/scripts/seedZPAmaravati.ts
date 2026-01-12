import mongoose from 'mongoose';
import Company from '../models/Company';
import Department from '../models/Department';
import User from '../models/User';
import { CompanyType, UserRole } from '../config/constants';
import bcrypt from 'bcryptjs';

const seedZPAmaravati = async () => {
  try {
    console.log('🌱 Seeding ZP Amaravati data...');

    // Connect to database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard');
    }

    // Check if ZP Amaravati company already exists
    const existingCompany = await Company.findOne({ name: 'ZP Amaravati' });
    if (existingCompany) {
      console.log('✅ ZP Amaravati company already exists');
      return;
    }

    // Create ZP Amaravati company
    const zpCompany = await Company.create({
      name: 'ZP Amaravati',
      companyType: CompanyType.GOVERNMENT,
      contactEmail: 'contact@zpamaravati.gov.in',
      contactPhone: '+91-2612-220123',
      address: 'Zilla Parishad, Amaravati, Maharashtra, India',
      enabledModules: [
        'GRIEVANCE',
        'APPOINTMENT',
        'STATUS_TRACKING',
        'SURVEY',
        'FEEDBACK',
        'DOCUMENT_UPLOAD'
      ],
      theme: {
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6'
      },
      isActive: true,
      isSuspended: false,
      isDeleted: false
    });

    console.log('✅ ZP Amaravati company created:', zpCompany.companyId);

    // Create departments
    const departments = [
      {
        name: 'Revenue Department',
        description: 'Handles revenue collection, tax assessment, and financial management',
        contactPerson: 'Revenue Officer',
        contactEmail: 'revenue@zpamaravati.gov.in',
        contactPhone: '+91-2612-220124'
      },
      {
        name: 'Health Department',
        description: 'Manages public health services, hospitals, and health programs',
        contactPerson: 'Health Officer',
        contactEmail: 'health@zpamaravati.gov.in',
        contactPhone: '+91-2612-220125'
      },
      {
        name: 'Water Supply Department',
        description: 'Responsible for water supply, sanitation, and water conservation',
        contactPerson: 'Water Supply Officer',
        contactEmail: 'water@zpamaravati.gov.in',
        contactPhone: '+91-2612-220126'
      },
      {
        name: 'Education Department',
        description: 'Manages schools, colleges, and educational programs',
        contactPerson: 'Education Officer',
        contactEmail: 'education@zpamaravati.gov.in',
        contactPhone: '+91-2612-220127'
      },
      {
        name: 'Agriculture Department',
        description: 'Handles agricultural development, farmer welfare, and crop management',
        contactPerson: 'Agriculture Officer',
        contactEmail: 'agriculture@zpamaravati.gov.in',
        contactPhone: '+91-2612-220128'
      },
      {
        name: 'Public Works Department',
        description: 'Manages infrastructure development, roads, and public construction',
        contactPerson: 'PWD Officer',
        contactEmail: 'pwd@zpamaravati.gov.in',
        contactPhone: '+91-2612-220129'
      },
      {
        name: 'Social Welfare Department',
        description: 'Handles social security, welfare schemes, and poverty alleviation',
        contactPerson: 'Welfare Officer',
        contactEmail: 'welfare@zpamaravati.gov.in',
        contactPhone: '+91-2612-220130'
      },
      {
        name: 'Urban Development Department',
        description: 'Manages urban planning, municipal services, and city development',
        contactPerson: 'Urban Development Officer',
        contactEmail: 'urban@zpamaravati.gov.in',
        contactPhone: '+91-2612-220131'
      }
    ];

    const createdDepartments = [];
    for (const dept of departments) {
      const department = await Department.create({
        ...dept,
        companyId: zpCompany._id,
        isActive: true,
        isDeleted: false
      });
      createdDepartments.push(department);
      console.log(`✅ Department created: ${department.name} (${department.departmentId})`);
    }

    // Create department admins
    const departmentAdmins = [
      {
        departmentName: 'Revenue Department',
        email: 'revenue.admin@zpamaravati.gov.in',
        firstName: 'Ramesh',
        lastName: 'Kumar',
        phone: '+91-9876543210'
      },
      {
        departmentName: 'Health Department',
        email: 'health.admin@zpamaravati.gov.in',
        firstName: 'Sunita',
        lastName: 'Patil',
        phone: '+91-9876543211'
      },
      {
        departmentName: 'Water Supply Department',
        email: 'water.admin@zpamaravati.gov.in',
        firstName: 'Vijay',
        lastName: 'Sharma',
        phone: '+91-9876543212'
      }
    ];

    for (const admin of departmentAdmins) {
      const department = createdDepartments.find(d => d.name === admin.departmentName);
      if (department) {
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        
        const user = await User.create({
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          password: hashedPassword,
          phone: admin.phone,
          role: UserRole.DEPARTMENT_ADMIN,
          companyId: zpCompany._id,
          departmentId: department._id,
          isActive: true,
          isEmailVerified: true
        });
        
        console.log(`✅ Department admin created: ${user.firstName} ${user.lastName} (${user.email})`);
      }
    }

    // Create company admin
    const companyAdminPassword = await bcrypt.hash('Admin@123', 10);
    const companyAdmin = await User.create({
      firstName: 'Anand',
      lastName: 'Jadhav',
      email: 'ceo@zpamaravati.gov.in',
      password: companyAdminPassword,
      phone: '+91-9876543200',
      role: UserRole.COMPANY_ADMIN,
      companyId: zpCompany._id,
      isActive: true,
      isEmailVerified: true
    });

    console.log(`✅ Company admin created: ${companyAdmin.firstName} ${companyAdmin.lastName} (${companyAdmin.email})`);

    console.log('\n🎉 ZP Amaravati seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Company Admin: ceo@zpamaravati.gov.in / Admin@123');
    console.log('Department Admins:');
    console.log('- revenue.admin@zpamaravati.gov.in / Admin@123');
    console.log('- health.admin@zpamaravati.gov.in / Admin@123');
    console.log('- water.admin@zpamaravati.gov.in / Admin@123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

// Run the seed function
if (require.main === module) {
  seedZPAmaravati()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedZPAmaravati;
