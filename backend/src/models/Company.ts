import mongoose, { Schema, Document, Model } from 'mongoose';
import { CompanyType, Module } from '../config/constants';

export interface ICompany extends Document {
  companyId: string;
  name: string;
  companyType: CompanyType;
  enabledModules: Module[];
  contactEmail: string;
  contactPhone: string;
  address?: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
  whatsappConfig?: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
  };
  chatbotConfig?: {
    flows: Array<{
      id: string;
      name: string;
      triggers: string[];
      steps: Array<{
        id: string;
        type: string;
        question?: string;
        action?: string;
        response?: string;
        nextStepId?: string;
        validation?: {
          type: string;
          required: boolean;
        };
      }>;
      defaultResponse?: string;
    }>;
    enabled: boolean;
  };
  isActive: boolean;
  isSuspended: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    companyId: {
      type: String,
      required: false,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    companyType: {
      type: String,
      enum: Object.values(CompanyType),
      required: true
    },
    enabledModules: [{
      type: String,
      enum: Object.values(Module)
    }],
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    contactPhone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      trim: true
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#0f4c81'
      },
      secondaryColor: {
        type: String,
        default: '#1a73e8'
      },
      logoUrl: {
        type: String
      }
    },
    whatsappConfig: {
      phoneNumberId: String,
      accessToken: String,
      businessAccountId: String
    },
    chatbotConfig: {
      flows: [{
        id: String,
        name: String,
        triggers: [String],
        steps: [{
          id: String,
          type: String,
          question: String,
          action: String,
          response: String,
          nextStepId: String,
          validation: {
            type: String,
            required: Boolean
          }
        }],
        defaultResponse: String
      }],
      enabled: {
        type: Boolean,
        default: true
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isSuspended: {
      type: Boolean,
      default: false
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

// Indexes
CompanySchema.index({ companyType: 1, isDeleted: 1 });
CompanySchema.index({ isActive: 1, isSuspended: 1, isDeleted: 1 });

// Pre-save hook to generate companyId
CompanySchema.pre('save', async function (next) {
  if (this.isNew && !this.companyId) {
    const count = await mongoose.model('Company').countDocuments();
    this.companyId = `CMP${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Query middleware to exclude soft-deleted by default
CompanySchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (!(this as any).getOptions().includeDeleted) {
    (this as any).where({ isDeleted: false });
  }
  next();
});

const Company: Model<ICompany> = mongoose.model<ICompany>('Company', CompanySchema);

export default Company;
