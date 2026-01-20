import dotenv from 'dotenv';
import { connectDatabase, closeDatabase } from '../config/database';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

/**
 * Migration Script: Move WhatsApp credentials from .env to database
 * 
 * This script:
 * 1. Reads WhatsApp credentials from environment variables
 * 2. Updates ZP Amravati (CMP000001) with these credentials
 * 3. Allows you to remove credentials from .env after migration
 */

const migrateWhatsAppCredentials = async () => {
  try {
    await connectDatabase();

    logger.info('🔄 Starting WhatsApp credentials migration...');

    // Get credentials from environment (if they exist)
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!phoneNumberId || !accessToken) {
      logger.warn('⚠️  No WhatsApp credentials found in environment variables.');
      logger.info('ℹ️  If you have already migrated, this is expected.');
      logger.info('ℹ️  Configure WhatsApp via SuperAdmin dashboard instead.');
      await closeDatabase();
      process.exit(0);
    }

    logger.info('📋 Found WhatsApp credentials in environment:');
    logger.info(`   Phone Number ID: ${phoneNumberId}`);
    logger.info(`   Business Account ID: ${businessAccountId || 'Not set'}`);

    // Find ZP Amravati (or first company)
    let company = await company.findOne({ companyId: 'CMP000001' });

    if (!company) {
      logger.warn('⚠️  CMP000001 (ZP Amravati) not found. Looking for first company...');
      company = await company.findOne({ isDeleted: false });
    }

    if (!company) {
      logger.error('❌ No companies found in database!');
      logger.info('ℹ️  Please create a company first via SuperAdmin dashboard.');
      await closeDatabase();
      process.exit(1);
    }

    logger.info(`✅ Found company: ${company.name} (${company.companyId})`);

    // Check if already configured
    if (company.whatsappConfig?.phoneNumberId && company.whatsappConfig?.accessToken) {
      logger.info('ℹ️  Company already has WhatsApp credentials configured:');
      logger.info(`   Phone Number ID: ${company.whatsappConfig.phoneNumberId}`);
      logger.info('');
      logger.info('❓ Do you want to overwrite with environment credentials?');
      logger.info('   If yes, delete the company\'s WhatsApp config and run this script again.');
      await closeDatabase();
      process.exit(0);
    }

    // Update company with WhatsApp credentials using findByIdAndUpdate
    // This bypasses validation on unchanged fields
    await company.findByIdAndUpdate(
      company._id,
      {
        $set: {
          'whatsappConfig.phoneNumberId': phoneNumberId,
          'whatsappConfig.accessToken': accessToken,
          'whatsappConfig.businessAccountId': businessAccountId || '',
          'whatsappConfig.verifyToken': verifyToken || ''
        }
      },
      { 
        runValidators: false, // Skip validation to avoid enum issues
        new: true 
      }
    );

    logger.info('');
    logger.info('✅ Migration completed successfully!');
    logger.info('='.repeat(60));
    logger.info(`Company: ${company.name}`);
    logger.info(`Phone Number ID: ${phoneNumberId}`);
    logger.info(`Business Account ID: ${businessAccountId || 'Not set'}`);
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('📝 Next Steps:');
    logger.info('1. ✅ WhatsApp credentials are now in database');
    logger.info('2. 🔧 You can now remove these from .env:');
    logger.info('   - WHATSAPP_PHONE_NUMBER_ID');
    logger.info('   - WHATSAPP_ACCESS_TOKEN');
    logger.info('   - WHATSAPP_BUSINESS_ACCOUNT_ID');
    logger.info('3. ⚠️  Keep WHATSAPP_VERIFY_TOKEN in .env (needed for webhook)');
    logger.info('4. 🚀 Future companies: Configure via SuperAdmin dashboard');
    logger.info('');

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    await closeDatabase();
    process.exit(1);
  }
};

// Run migration
migrateWhatsAppCredentials();