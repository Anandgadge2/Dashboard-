import mongoose from 'mongoose';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import Counter from '../models/Counter';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to sync Counter values with actual database state
 * Run this when you get duplicate key errors for grievanceId or appointmentId
 */
const syncCounters = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('✅ Connected to MongoDB');

    // Fix Grievance Counter
    console.log('\n📋 Checking Grievance Counter...');
    const lastGrievance = await Grievance.findOne({}, { grievanceId: 1 })
      .sort({ grievanceId: -1 });
    
    if (lastGrievance && lastGrievance.grievanceId) {
      const match = lastGrievance.grievanceId.match(/^GRV(\d+)$/);
      if (match) {
        const lastNum = parseInt(match[1], 10);
        console.log(`   Last grievanceId in DB: ${lastGrievance.grievanceId} (${lastNum})`);
        
        // Update counter to be at least this value
        const result = await Counter.findOneAndUpdate(
          { name: 'grievance' },
          { $set: { value: lastNum } },
          { upsert: true, new: true }
        );
        
        console.log(`   ✅ Counter updated to: ${result.value}`);
      }
    } else {
      console.log('   ℹ️  No grievances found in database');
      await Counter.findOneAndUpdate(
        { name: 'grievance' },
        { $set: { value: 0 } },
        { upsert: true, new: true }
      );
      console.log('   ✅ Counter initialized to: 0');
    }

    // Fix Appointment Counter
    console.log('\n📅 Checking Appointment Counter...');
    const lastAppointment = await Appointment.findOne({}, { appointmentId: 1 })
      .sort({ appointmentId: -1 });
    
    if (lastAppointment && lastAppointment.appointmentId) {
      const match = lastAppointment.appointmentId.match(/^APT(\d+)$/);
      if (match) {
        const lastNum = parseInt(match[1], 10);
        console.log(`   Last appointmentId in DB: ${lastAppointment.appointmentId} (${lastNum})`);
        
        // Update counter to be at least this value
        const result = await Counter.findOneAndUpdate(
          { name: 'appointment' },
          { $set: { value: lastNum } },
          { upsert: true, new: true }
        );
        
        console.log(`   ✅ Counter updated to: ${result.value}`);
      }
    } else {
      console.log('   ℹ️  No appointments found in database');
      await Counter.findOneAndUpdate(
        { name: 'appointment' },
        { $set: { value: 0 } },
        { upsert: true, new: true }
      );
      console.log('   ✅ Counter initialized to: 0');
    }

    console.log('\n✅ Counter sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing counters:', error);
    process.exit(1);
  }
};

syncCounters();
