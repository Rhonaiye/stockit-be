
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    STAFF = 'STAFF',
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    PENDING_INVITE = 'PENDING_INVITE',
}

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true, select: false }) // Hide password by default
    password: string;

    @Prop()
    phone?: string;

    @Prop({ required: true, enum: UserRole, default: UserRole.STAFF })
    role: UserRole;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: false })
    companyId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: false })
    branchId: string;

    @Prop({ enum: UserStatus, default: UserStatus.ACTIVE })
    status: UserStatus;

    // Invitation tracking
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    invitedBy?: string;

    @Prop()
    invitedAt?: Date;

    @Prop()
    inviteToken?: string;

    @Prop()
    inviteTokenExpires?: Date;

    // Activity tracking
    @Prop()
    lastLoginAt?: Date;

    @Prop()
    lastActivityAt?: Date;

    @Prop({ default: 0 })
    loginCount: number;

    // Suspension
    @Prop()
    suspendedAt?: Date;

    @Prop()
    suspendedBy?: string;

    @Prop()
    suspendedReason?: string;

    // Two-Factor Authentication
    @Prop({ default: false })
    twoFactorEnabled: boolean;

    @Prop({ select: false })
    twoFactorSecret?: string;

    // Notification Preferences
    @Prop({
        type: Object,
        default: {
            email: true,
            sms: false,
            push: true,
            lowStockAlerts: true,
            dailySummary: false,
            weeklyReports: true
        }
    })
    notificationPreferences: {
        email: boolean;
        sms: boolean;
        push: boolean;
        lowStockAlerts: boolean;
        dailySummary: boolean;
        weeklyReports: boolean;
    };

    // Password reset
    @Prop()
    passwordResetToken?: string;

    @Prop()
    passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for efficient querying
UserSchema.index({ companyId: 1, status: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ inviteToken: 1 });

