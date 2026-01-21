import mongoose from 'mongoose';
import Counter from '../models/Counter';

/**
 * Atomically generate the next sequential ID for grievances
 */
export async function getNextGrievanceId(): Promise<string> {
  const result = await Counter.findOneAndUpdate(
    { name: 'grievance' },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );

  const nextNum = result.value;
  return `GRV${String(nextNum).padStart(8, '0')}`;
}

/**
 * Atomically generate the next sequential ID for appointments
 */
export async function getNextAppointmentId(): Promise<string> {
  const result = await Counter.findOneAndUpdate(
    { name: 'appointment' },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );

  const nextNum = result.value;
  return `APT${String(nextNum).padStart(8, '0')}`;
}

/**
 * Initialize counters from existing data (migration helper)
 */
export async function initializeCounters(): Promise<void> {
  try {
    const Grievance = mongoose.model('Grievance');
    const Appointment = mongoose.model('Appointment');

    // Initialize grievance counter
    const grievanceCounter = await Counter.findOne({ name: 'grievance' });
    if (!grievanceCounter) {
      const lastGrievance = await Grievance.findOne({}, { grievanceId: 1 })
        .sort({ grievanceId: -1 })
        .setOptions({ includeDeleted: true });

      let initialValue = 0;
      if (lastGrievance && lastGrievance.grievanceId) {
        const match = lastGrievance.grievanceId.match(/^GRV(\d+)$/);
        if (match) {
          initialValue = parseInt(match[1], 10);
        }
      }

      await Counter.create({ name: 'grievance', value: initialValue });
      console.log(`✅ Initialized grievance counter at ${initialValue}`);
    }

    // Initialize appointment counter
    const appointmentCounter = await Counter.findOne({ name: 'appointment' });
    if (!appointmentCounter) {
      const lastAppointment = await Appointment.findOne({}, { appointmentId: 1 })
        .sort({ appointmentId: -1 })
        .setOptions({ includeDeleted: true });

      let initialValue = 0;
      if (lastAppointment && lastAppointment.appointmentId) {
        const match = lastAppointment.appointmentId.match(/^APT(\d+)$/);
        if (match) {
          initialValue = parseInt(match[1], 10);
        }
      }

      await Counter.create({ name: 'appointment', value: initialValue });
      console.log(`✅ Initialized appointment counter at ${initialValue}`);
    }
  } catch (error) {
    console.error('❌ Error initializing counters:', error);
  }
}
