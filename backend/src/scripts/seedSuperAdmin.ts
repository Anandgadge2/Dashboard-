import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import { UserRole } from '../config/constants';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

const SUPER_ADMIN_EMAIL = 'superadmin@platform.com';
const SUPER_ADMIN_PHONE = '919999999999'; // 91 + 10-digit; no company/department
const SUPER_ADMIN_PASSWORD = '111111';

const seedSuperAdmin = async () => {
  try {
    await connectDatabase();

    const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });

    if (existingSuperAdmin) {
      logger.info('SuperAdmin already exists:');
      logger.info(`Email: ${existingSuperAdmin.email}`);
      logger.info(`Name: ${existingSuperAdmin.getFullName()}`);
      logger.warn('To create a new SuperAdmin, delete the existing one first.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: SUPER_ADMIN_EMAIL,
      phone: SUPER_ADMIN_PHONE,
      password: SUPER_ADMIN_PASSWORD,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      // companyId, departmentId left undefined for SUPER_ADMIN
      // isDeleted defaults to false
    });

    logger.info('✅ SuperAdmin created successfully!');
    logger.info('='.repeat(50));
    logger.info(`User ID: ${superAdmin.userId}`);
    logger.info(`Email: ${superAdmin.email}`);
    logger.info(`Phone: ${SUPER_ADMIN_PHONE}`);
    logger.info(`Password: ${SUPER_ADMIN_PASSWORD}`);
    logger.info(`Name: ${superAdmin.getFullName()}`);
    logger.info(`Role: ${superAdmin.role}`);
    logger.info('='.repeat(50));
    logger.info('⚠️  IMPORTANT: Change the password after first login!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed SuperAdmin:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

// Run the seed function
seedSuperAdmin();
