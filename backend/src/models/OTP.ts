import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOTP extends Document {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
}

const OTPSchema: Schema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true
    },
    otp: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 } // Auto-delete expired OTPs
    },
    verified: {
      type: Boolean,
      default: false
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for faster lookups
OTPSchema.index({ phoneNumber: 1, verified: 1 });

const OTP: Model<IOTP> = mongoose.model<IOTP>('OTP', OTPSchema);

export default OTP;
