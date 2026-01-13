import mongoose, { Schema, Document, Model } from 'mongoose';
import { AppointmentStatus } from '../config/constants';

export interface IAppointment extends Document {
  appointmentId: string;
  companyId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  citizenName: string;
  citizenPhone: string;
  citizenWhatsApp?: string;
  citizenEmail?: string;
  purpose: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration?: number; // in minutes
  status: AppointmentStatus;
  statusHistory: Array<{
    status: AppointmentStatus;
    changedBy?: mongoose.Types.ObjectId;
    changedAt: Date;
    remarks?: string;
  }>;
  assignedTo?: mongoose.Types.ObjectId;
  location?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  completedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  timeline: Array<{
    action: string;
    details?: any;
    performedBy?: mongoose.Types.ObjectId;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true
    },
    citizenName: {
      type: String,
      required: true,
      trim: true
    },
    citizenPhone: {
      type: String,
      required: true,
      index: true
    },
    citizenWhatsApp: {
      type: String
    },
    citizenEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    purpose: {
      type: String,
      required: true
    },
    appointmentDate: {
      type: Date,
      required: true,
      index: true
    },
    appointmentTime: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      default: 30 // 30 minutes default
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
      index: true
    },
    statusHistory: [{
      status: {
        type: String,
        enum: Object.values(AppointmentStatus),
        required: true
      },
      changedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      remarks: String
    }],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    location: {
      type: String,
      trim: true
    },
    notes: {
      type: String
    },
    cancellationReason: {
      type: String
    },
    cancelledAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timeline: [{
      action: {
        type: String,
        required: true
      },
      details: Schema.Types.Mixed,
      performedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

// Compound indexes
AppointmentSchema.index({ companyId: 1, status: 1, isDeleted: 1 });
AppointmentSchema.index({ departmentId: 1, appointmentDate: 1, isDeleted: 1 });
AppointmentSchema.index({ assignedTo: 1, appointmentDate: 1, isDeleted: 1 });

// Pre-save hook to generate appointmentId
AppointmentSchema.pre('save', async function (next) {
  if (this.isNew && !this.appointmentId) {
    const count = await mongoose.model('Appointment').countDocuments({ companyId: this.companyId });
    this.appointmentId = `APT${String(count + 1).padStart(8, '0')}`;
    
    // Initialize status history
    this.statusHistory = [{
      status: this.status,
      changedAt: new Date()
    }];

    // Initialize timeline
    this.timeline = [{
      action: 'CREATED',
      details: {
        purpose: this.purpose,
        date: this.appointmentDate,
        time: this.appointmentTime
      },
      timestamp: new Date()
    }];
  }
  next();
});

// Query middleware to exclude soft-deleted by default
AppointmentSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (!(this as any).getOptions().includeDeleted) {
    (this as any).where({ isDeleted: false });
  }
  next();
});

const Appointment: Model<IAppointment> = mongoose.model<IAppointment>('Appointment', AppointmentSchema);

export default Appointment;
