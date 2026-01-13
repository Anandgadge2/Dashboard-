import mongoose, { Schema, Document, Model } from 'mongoose';
import { GrievanceStatus } from '../config/constants';

export interface IGrievance extends Document {
  grievanceId: string;
  companyId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  citizenName: string;
  citizenPhone: string;
  citizenWhatsApp?: string;
  description: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: GrievanceStatus;
  statusHistory: Array<{
    status: GrievanceStatus;
    changedBy?: mongoose.Types.ObjectId;
    changedAt: Date;
    remarks?: string;
  }>;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
  };
  media: Array<{
    url: string;
    type: 'image' | 'document';
    uploadedAt: Date;
  }>;
  resolution?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  slaBreached: boolean;
  slaDueDate?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  language: 'en' | 'hi' | 'mr';
  timeline: Array<{
    action: string;
    details?: any;
    performedBy?: mongoose.Types.ObjectId;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const GrievanceSchema: Schema = new Schema(
  {
    grievanceId: {
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
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: Object.values(GrievanceStatus),
      default: GrievanceStatus.PENDING,
      index: true
    },
    statusHistory: [{
      status: {
        type: String,
        enum: Object.values(GrievanceStatus),
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
    assignedAt: {
      type: Date
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      },
      address: String
    },
    media: [{
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['image', 'document'],
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    resolution: {
      type: String
    },
    resolvedAt: {
      type: Date
    },
    closedAt: {
      type: Date
    },
    slaBreached: {
      type: Boolean,
      default: false,
      index: true
    },
    slaDueDate: {
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
    language: {
      type: String,
      enum: ['en', 'hi', 'mr'],
      default: 'en'
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
GrievanceSchema.index({ companyId: 1, status: 1, isDeleted: 1 });
GrievanceSchema.index({ departmentId: 1, status: 1, isDeleted: 1 });
GrievanceSchema.index({ assignedTo: 1, status: 1, isDeleted: 1 });
GrievanceSchema.index({ createdAt: -1 });

// Pre-save hook to generate grievanceId
GrievanceSchema.pre('save', async function (next) {
  if (this.isNew && !this.grievanceId) {
    const count = await mongoose.model('Grievance').countDocuments({ companyId: this.companyId });
    this.grievanceId = `GRV${String(count + 1).padStart(8, '0')}`;
    
    // Initialize status history
    this.statusHistory = [{
      status: this.status,
      changedAt: new Date()
    }];

    // Initialize timeline
    this.timeline = [{
      action: 'CREATED',
      details: {
        description: this.description,
        category: this.category
      },
      timestamp: new Date()
    }];
  }
  next();
});

// Query middleware to exclude soft-deleted by default
GrievanceSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (!(this as any).getOptions().includeDeleted) {
    (this as any).where({ isDeleted: false });
  }
  next();
});

const Grievance: Model<IGrievance> = mongoose.model<IGrievance>('Grievance', GrievanceSchema);

export default Grievance;
