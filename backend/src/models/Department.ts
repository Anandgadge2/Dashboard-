import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDepartment extends Document {
  departmentId: string;
  companyId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema: Schema = new Schema(
  {
    departmentId: {
      type: String,
      required: false,
      unique: true,
      index: true
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    contactPhone: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
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
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
DepartmentSchema.index({ companyId: 1, isDeleted: 1 });
DepartmentSchema.index({ companyId: 1, name: 1 }, { unique: true });

// Pre-save hook to generate departmentId
DepartmentSchema.pre('save', async function (next) {
  if (this.isNew && !this.departmentId) {
    const count = await mongoose.model('Department').countDocuments({ companyId: this.companyId });
    this.departmentId = `DEPT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Query middleware to exclude soft-deleted by default
DepartmentSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (!(this as any).getOptions().includeDeleted) {
    (this as any).where({ isDeleted: false });
  }
  next();
});

const Department: Model<IDepartment> = mongoose.model<IDepartment>('Department', DepartmentSchema);

export default Department;
