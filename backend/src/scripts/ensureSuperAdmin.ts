import dotenv from 'dotenv';
import User from '../models/User';
import { UserRole } from '../config/constants';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

const ensureSuperAdmin = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Check if SuperAdmin already exists
    const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });

    if (existingSuperAdmin) {
      logger.info('SuperAdmin already exists:');
      logger.info(`Email: ${existingSuperAdmin.email}`);
      logger.info(`Name: ${existingSuperAdmin.getFullName()}`);
      logger.info(`User ID: ${existingSuperAdmin.userId}`);
      logger.info(`Active: ${existingSuperAdmin.isActive}`);
      
      // Ensure SuperAdmin is active
      if (!existingSuperAdmin.isActive) {
        existingSuperAdmin.isActive = true;
        await existingSuperAdmin.save();
        logger.info('✅ SuperAdmin account has been activated!');
      } else {
        logger.info('✅ SuperAdmin account is already active!');
      }
      
      process.exit(0);
    }

    // Create SuperAdmin user if doesn't exist
    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@platform.com',
      password: '111111', // Will be hashed automatically by pre-save hook
      role: UserRole.SUPER_ADMIN,
      isActive: true
    });

    logger.info('✅ SuperAdmin created successfully!');
    logger.info('='.repeat(50));
    logger.info(`User ID: ${superAdmin.userId}`);
    logger.info(`Email: ${superAdmin.email}`);
    logger.info(`Password: 111111`);
    logger.info(`Name: ${superAdmin.getFullName()}`);
    logger.info(`Role: ${superAdmin.role}`);
    logger.info(`Active: ${superAdmin.isActive}`);
    logger.info('='.repeat(50));
    logger.info('⚠️  IMPORTANT: Change the password after first login!');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to ensure SuperAdmin:', error);
    process.exit(1);
  }
};

// Run the function
ensureSuperAdmin();
