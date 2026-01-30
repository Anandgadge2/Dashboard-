/**
 * Seed script for Zilla Parishad Amravati
 * Company: Zilla Parishad Amravati
 * Creates company, departments (district-level + Panchayat Samitis), and users
 * with proper role and department mapping.
 *
 * Before seeding: removes all users (except SUPER_ADMIN), grievances, appointments,
 * departments, and companies from the database.
 *
 * Default password for all seeded users: 111111
 *
 * Run: npm run seed:zpamravati-full
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Company from '../models/Company';
import Department from '../models/Department';
import User from '../models/User';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import { CompanyType, UserRole } from '../config/constants';

const DEFAULT_PASSWORD = '111111';

// Store phone as 91 + 10-digit Indian mobile
const phoneFor = (mobile: string) => '91' + mobile.replace(/\D/g, '').slice(-10);

const seedZillaParishadAmravati = async () => {
  try {
    console.log('🌱 Seeding Zilla Parishad Amravati (company, departments, users)...\n');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not set. Add it to .env or set the environment variable.');
      process.exit(1);
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to database\n');
    }

    // ----- 0. CLEAN: Remove all data except SUPER_ADMIN user -----
    console.log('🧹 Cleaning database (keeping SUPER_ADMIN only)...');
    const grievanceResult = await Grievance.deleteMany({});
    console.log(`   Deleted ${grievanceResult.deletedCount} grievances`);
    const appointmentResult = await Appointment.deleteMany({});
    console.log(`   Deleted ${appointmentResult.deletedCount} appointments`);
    const departmentResult = await Department.deleteMany({});
    console.log(`   Deleted ${departmentResult.deletedCount} departments`);
    const userResult = await User.deleteMany({ role: { $ne: UserRole.SUPER_ADMIN } });
    console.log(`   Deleted ${userResult.deletedCount} users (SUPER_ADMIN kept)`);
    const companyResult = await Company.deleteMany({});
    console.log(`   Deleted ${companyResult.deletedCount} companies`);
    console.log('✅ Cleanup done.\n');

    // ----- 0.5 ENSURE SUPER_ADMIN exists (create if missing) -----
    let superAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });
    if (!superAdmin) {
      superAdmin = await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@platform.com',
        phone: '919999999999',
        password: DEFAULT_PASSWORD,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });
      console.log('✅ SuperAdmin created (superadmin@platform.com / 111111)\n');
    } else {
      console.log('✅ SuperAdmin already exists (kept)\n');
    }

    // ----- 1. COMPANY -----
    const company = await Company.create({
      name: 'Zilla Parishad Amravati',
      companyType: CompanyType.GOVERNMENT,
      contactEmail: 'ceozp.amravati@maharashtra.gov.in',
      contactPhone: '0721-2662926',
      address: 'Zilla Parishad Bhavan, Amravati, Maharashtra, India',
      enabledModules: ['GRIEVANCE', 'APPOINTMENT', 'STATUS_TRACKING', 'RTS', 'DOCUMENT_UPLOAD'],
      theme: { primaryColor: '#1e40af', secondaryColor: '#3b82f6' },
      isActive: true,
      isSuspended: false,
      isDeleted: false,
    });
    console.log('✅ Company created: Zilla Parishad Amravati');

    const companyId = company._id;

    // ----- 2. DEPARTMENTS (District-level + Panchayat Samitis) -----
    const districtDepts: Array<{ name: string; deptNo: string; description: string; contactEmail: string; contactPhone: string }> = [
      { name: 'DRDA', deptNo: '01', description: 'District Rural Development Agency - Project Director (DRDA)', contactEmail: 'amravatidrda@gmail.com', contactPhone: '0721-2662149' },
      { name: 'SAPRAVI', deptNo: '02', description: 'Deputy CEO (SAPRAVI)', contactEmail: 'dyceogadzpamt@gmail.com', contactPhone: '0721-2662932' },
      { name: 'Gram Panchayat (Deputy CEO)', deptNo: '03', description: 'Deputy CEO - Gram Panchayat', contactEmail: 'mhdyceo@gmail.com', contactPhone: '0721-2662473' },
      { name: 'Women & Child Development', deptNo: '04', description: 'Deputy CEO - Women & Child Development', contactEmail: 'dyceobalkalyan@gmail.com', contactPhone: '0721-2661934' },
      { name: 'Water & Sanitation / MGNREGA', deptNo: '05', description: 'Water & Sanitation / MGNREGA', contactEmail: 'sbmzpamt@gmail.com', contactPhone: '0721-2551123' },
      { name: 'Accounts & Finance', deptNo: '06', description: 'Chief Accounts & Finance Officer', contactEmail: 'cafozpamravati@gmail.com', contactPhone: '0721-2662937' },
      { name: 'Health', deptNo: '07', description: 'District Health Officer', contactEmail: 'dhoamravati@gmail.com', contactPhone: '0721-2662591' },
      { name: 'Social Welfare', deptNo: '08', description: 'District Social Welfare Officer', contactEmail: 'swozpamt@gmail.com', contactPhone: '0721-2662059' },
      { name: 'Education (Primary)', deptNo: '09', description: 'Education Officer - Primary', contactEmail: 'ssaamravati1@gmail.com', contactPhone: '0721-2970206' },
      { name: 'Education (Secondary)', deptNo: '10', description: 'Education Officer - Secondary', contactEmail: 'eosasecondary.amt@gmail.com', contactPhone: '0721-2662880' },
      { name: 'Education (Planning)', deptNo: '11', description: 'Education Officer - Planning', contactEmail: 'ssaamravati1@gmail.com', contactPhone: '0721-2662880' },
      { name: 'Construction (EE)', deptNo: '12', description: 'Executive Engineer - Construction', contactEmail: 'eezpamt@gmail.com', contactPhone: '0721-2662484' },
      { name: 'Gram Panchayat (EE)', deptNo: '13', description: 'Executive Engineer - Gram Panchayat', contactEmail: 'eebnamt@gmail.com', contactPhone: '0721-2665942' },
      { name: 'Minor Irrigation', deptNo: '14', description: 'Executive Engineer - Minor Irrigation', contactEmail: 'eeizpamt@gmail.com', contactPhone: '0721-2662058' },
      { name: 'Animal Husbandry', deptNo: '15', description: 'District Animal Husbandry Officer', contactEmail: 'dahoamravati@gmail.com', contactPhone: '0721-2662066' },
      { name: 'Agriculture', deptNo: '16', description: 'Agriculture Development Officer', contactEmail: 'adozpamt@gmail.com', contactPhone: '0721-2662878' },
    ];

    const psDepts: Array<{ name: string; deptNo: string; description: string }> = [
      { name: 'PS Amravati', deptNo: '17', description: 'Panchayat Samiti Amravati - BDO' },
      { name: 'PS Achalpur', deptNo: '18', description: 'Panchayat Samiti Achalpur - BDO' },
      { name: 'PS Anjangaon', deptNo: '19', description: 'Panchayat Samiti Anjangaon - BDO' },
      { name: 'PS Chandur Bazar', deptNo: '20', description: 'Panchayat Samiti Chandur Bazar - BDO' },
      { name: 'PS Dhamangaon', deptNo: '21', description: 'Panchayat Samiti Dhamangaon - BDO' },
      { name: 'PS Morshi', deptNo: '22', description: 'Panchayat Samiti Morshi - BDO' },
      { name: 'PS Tiwsa', deptNo: '23', description: 'Panchayat Samiti Tiwsa - BDO' },
      { name: 'PS Chikhaldara', deptNo: '24', description: 'Panchayat Samiti Chikhaldara - BDO' },
      { name: 'PS Dharni', deptNo: '25', description: 'Panchayat Samiti Dharni - BDO' },
      { name: 'PS Nandgaon Khandeshwar', deptNo: '26', description: 'Panchayat Samiti Nandgaon Khandeshwar - BDO' },
      { name: 'PS Bhatkuli', deptNo: '27', description: 'Panchayat Samiti Bhatkuli - BDO' },
      { name: 'PS Warud', deptNo: '28', description: 'Panchayat Samiti Warud - BDO' },
      { name: 'PS Daryapur', deptNo: '29', description: 'Panchayat Samiti Daryapur - BDO' },
    ];

    const deptNameToId: Record<string, mongoose.Types.ObjectId> = {};

    for (const d of districtDepts) {
      let dept = await Department.findOne({ companyId, name: d.name, isDeleted: false });
      if (!dept) {
        dept = await Department.create({
          companyId,
          name: d.name,
          description: `Dept No. ${d.deptNo} - ${d.description}`,
          contactEmail: d.contactEmail,
          contactPhone: d.contactPhone,
          isActive: true,
          isDeleted: false,
        });
        console.log(`   Department: ${d.name} (${d.deptNo})`);
      }
      deptNameToId[d.name] = dept._id;
    }

    for (const d of psDepts) {
      let dept = await Department.findOne({ companyId, name: d.name, isDeleted: false });
      if (!dept) {
        dept = await Department.create({
          companyId,
          name: d.name,
          description: `Dept No. ${d.deptNo} - ${d.description}`,
          isActive: true,
          isDeleted: false,
        });
        console.log(`   Department: ${d.name} (${d.deptNo})`);
      }
      deptNameToId[d.name] = dept._id;
    }

    console.log(`\n✅ Departments ready: ${Object.keys(deptNameToId).length}\n`);

    // User model hashes password on save - pass plain password
    const ensureUser = async (payload: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      role: UserRole;
      departmentName?: string;
    }) => {
      const phone = phoneFor(payload.phone);
      let user = await User.findOne({ $or: [{ email: payload.email }, { phone }] }).setOptions({ includeDeleted: true });
      if (user) {
        if (user.isDeleted) return;
        // Only update if same company (re-run seed for this ZP)
        if (user.companyId?.toString() !== companyId.toString()) {
          console.log(`   Skipped (different company): ${payload.email}`);
          return;
        }
        const updates: Record<string, unknown> = {
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone,
          role: payload.role,
          departmentId: payload.departmentName ? deptNameToId[payload.departmentName] : undefined,
        };
        await User.updateOne({ _id: user._id }, updates);
        console.log(`   Updated: ${payload.firstName} ${payload.lastName} (${payload.role})`);
        return;
      }
        await User.create({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        password: DEFAULT_PASSWORD,
        phone,
        role: payload.role,
        companyId,
        departmentId: payload.departmentName ? deptNameToId[payload.departmentName] : undefined,
        isActive: true,
        isDeleted: false,
      });
      console.log(`   Created: ${payload.firstName} ${payload.lastName} (${payload.role})`);
    };

    // ----- 3. COMPANY ADMINS (no department) -----
    console.log('👔 Company Admins');
    await ensureUser({
      firstName: 'Sanjita',
      lastName: 'Mahapatra',
      email: 'ceozp.amravati@maharashtra.gov.in',
      phone: '7978504317',
      role: UserRole.COMPANY_ADMIN,
    });
    await ensureUser({
      firstName: 'Vinay',
      lastName: 'Thamke',
      email: 'addceozpamt@gmail.com',
      phone: '9011400412',
      role: UserRole.COMPANY_ADMIN,
    });

    // ----- 4. DEPARTMENT ADMINS (mapped to district departments) -----
    console.log('\n🧭 Department Admins');
    const deptAdmins = [
      { firstName: 'Priti', lastName: 'Deshmukh', email: 'amravatidrda@gmail.com', phone: '9422961487', departmentName: 'DRDA' },
      { firstName: 'Shriram', lastName: 'Kulkarni', email: 'dyceogadzpamt@gmail.com', phone: '9921974626', departmentName: 'SAPRAVI' },
      { firstName: 'Balasaheb', lastName: 'Bais', email: 'mhdyceo@gmail.com', phone: '9860150981', departmentName: 'Gram Panchayat (Deputy CEO)' },
      { firstName: 'Vilas', lastName: 'Marsale', email: 'dyceobalkalyan@gmail.com', phone: '9834520295', departmentName: 'Women & Child Development' },
      { firstName: 'Balasaheb', lastName: 'Raibole', email: 'sbmzpamt@gmail.com', phone: '8830754358', departmentName: 'Water & Sanitation / MGNREGA' },
      { firstName: 'Shilpa', lastName: 'Pawar', email: 'cafozpamravati@gmail.com', phone: '9767506659', departmentName: 'Accounts & Finance' },
      { firstName: 'Pravin', lastName: 'Parise', email: 'dhoamravati@gmail.com', phone: '9096323895', departmentName: 'Health' },
      { firstName: 'Gnanba', lastName: 'Pund', email: 'swozpamt@gmail.com', phone: '9588473001', departmentName: 'Social Welfare' },
      { firstName: 'Satish', lastName: 'Mugal', email: 'ssaamravati1@gmail.com', phone: '9423612522', departmentName: 'Education (Primary)' },
      { firstName: 'Priya', lastName: 'Deshmukh', email: 'eosasecondary.amt@gmail.com', phone: '8975870902', departmentName: 'Education (Secondary)' },
      { firstName: 'Suresh', lastName: 'Waghmare', email: 'ssaamravati1@gmail.com', phone: '9405586344', departmentName: 'Education (Planning)' },
      { firstName: 'Dinesh', lastName: 'Gaikwad', email: 'eezpamt@gmail.com', phone: '7721085315', departmentName: 'Construction (EE)' },
      { firstName: 'Sneha', lastName: 'Dhawade', email: 'eebnamt@gmail.com', phone: '9766353607', departmentName: 'Gram Panchayat (EE)' },
      { firstName: 'Sunil', lastName: 'Jadhav', email: 'eeizpamt@gmail.com', phone: '8275812456', departmentName: 'Minor Irrigation' },
      { firstName: 'Purushottam', lastName: 'Solanke', email: 'dahoamravati@gmail.com', phone: '9403720501', departmentName: 'Animal Husbandry' },
      { firstName: 'Malla', lastName: 'Todkar', email: 'adozpamt@gmail.com', phone: '9890211574', departmentName: 'Agriculture' },
    ];

    // Suresh Waghmare and Satish Mugal share ssaamravati1@gmail.com - use unique emails
    const deptAdminEmailOverride: Record<string, string> = {
      'Suresh Waghmare': 'eoplanning.zpamt@gmail.com',
      'Satish Mugal': 'eoprimary.zpamt@gmail.com',
    };
    for (const u of deptAdmins) {
      const email = deptAdminEmailOverride[`${u.firstName} ${u.lastName}`] || u.email;
      await ensureUser({
        firstName: u.firstName,
        lastName: u.lastName,
        email,
        phone: u.phone,
        role: UserRole.DEPARTMENT_ADMIN,
        departmentName: u.departmentName,
      });
    }

    // ----- 5. OPERATORS (BDOs – mapped to Panchayat Samiti departments) -----
    console.log('\n🧑‍💼 Operators (BDOs)');
    const operators = [
      { firstName: 'Sudarshan', lastName: 'Tupe', email: 'bdopsamravati@gmail.com', phone: '8275043131', departmentName: 'PS Amravati' },
      { firstName: 'Sudhir', lastName: 'Arabat', email: 'bdopsachalpur@gmail.com', phone: '9921636855', departmentName: 'PS Achalpur' },
      { firstName: 'Kalpana', lastName: 'Jaybhaye', email: 'bdopsanjangaon@gmail.com', phone: '8788102939', departmentName: 'PS Anjangaon' },
      { firstName: 'Nilesh', lastName: 'Wankhade', email: 'bdopschandurbz@gmail.com', phone: '9970540506', departmentName: 'PS Chandur Bazar' },
      { firstName: 'Prafull', lastName: 'Bhorkhade', email: 'bdopsdhamangaonrly@gmail.com', phone: '8275393648', departmentName: 'PS Dhamangaon' },
      { firstName: 'Swapnil', lastName: 'Magdum', email: 'bdopsmorshi@gmail.com', phone: '9970203355', departmentName: 'PS Morshi' },
      { firstName: 'Abhishek', lastName: 'Kasode', email: 'bdopstiwsa@gmail.com', phone: '9967114929', departmentName: 'PS Tiwsa' },
      { firstName: 'Vinod', lastName: 'Khedkar', email: 'bdopschikhaldara@gmail.com', phone: '9421525555', departmentName: 'PS Chikhaldara' },
      { firstName: 'Vijay', lastName: 'Gaikwad', email: 'bdopsdharni@gmail.com', phone: '9011845529', departmentName: 'PS Dharni' },
      { firstName: 'Snehal', lastName: 'Shelar', email: 'bdopsndkz@gmail.com', phone: '9423032210', departmentName: 'PS Nandgaon Khandeshwar' },
      { firstName: 'Tushar', lastName: 'Dandge', email: 'bdopsbhatkuli@gmail.com', phone: '9921684462', departmentName: 'PS Bhatkuli' },
      { firstName: 'Khushal', lastName: 'Pillare', email: 'bdopswarud@gmail.com', phone: '7378720312', departmentName: 'PS Warud' },
      { firstName: 'C. J.', lastName: 'Dhavak', email: 'bdopsdaryapur215@gmail.com', phone: '8412017427', departmentName: 'PS Daryapur' },
    ];

    for (const u of operators) {
      await ensureUser({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        role: UserRole.OPERATOR,
        departmentName: u.departmentName,
      });
    }

    // ----- 6. COMPANY ADMINS (Direct SSO) – Sanjita Mahapatra (I.A.S.) for ZP Amravati -----
    console.log('\n🔗 Company Admin (Direct SSO): Sanjita Mahapatra (I.A.S.)');
    await ensureUser({
      firstName: 'Sanjita',
      lastName: 'Mahapatra (I.A.S.)',
      email: 'sanjita.9021550841@zpamravati.org',
      phone: '9021550841',
      role: UserRole.COMPANY_ADMIN,
    });
    await ensureUser({
      firstName: 'Sanjita',
      lastName: 'Mahapatra (I.A.S.)',
      email: 'sanjita.5555555555@zpamravati.org',
      phone: '5555555555',
      role: UserRole.COMPANY_ADMIN,
    });

    console.log('\n🎉 Zilla Parishad Amravati seed completed.\n');
    console.log('📋 Summary:');
    console.log(`   Company: Zilla Parishad Amravati`);
    console.log(`   Departments: ${Object.keys(deptNameToId).length} (16 district + 13 Panchayat Samiti)`);
    console.log(`   Company Admins: 4 (incl. Sanjita Mahapatra I.A.S. for 9021550841, 5555555555)`);
    console.log(`   Department Admins: ${deptAdmins.length}`);
    console.log(`   Operators (BDOs): ${operators.length}`);
    console.log(`\n🔐 Default password for all seeded users: ${DEFAULT_PASSWORD}`);
    console.log('\n📌 Sample logins:');
    console.log('   SuperAdmin: superadmin@platform.com (or phone: 919999999999)');
    console.log('   Company Admin: ceozp.amravati@maharashtra.gov.in');
    console.log('   Company Admin: addceozpamt@gmail.com');
    console.log('   Company Admin (Sanjita Mahapatra I.A.S.): 9021550841, 5555555555');
    console.log('   Dept Admin (DRDA): amravatidrda@gmail.com');
    console.log('   Operator (PS Amravati): bdopsamravati@gmail.com');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedZillaParishadAmravati()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export default seedZillaParishadAmravati;
