
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyDocument = Company & Document;

export enum SubscriptionStatus {
    ACTIVE = 'ACTIVE',
    TRIAL = 'TRIAL',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
}

export enum SubscriptionPlan {
    FREE = 'FREE',
    STARTER = 'STARTER',
    PROFESSIONAL = 'PROFESSIONAL',
    ENTERPRISE = 'ENTERPRISE',
}

// Plan limits configuration
export const PLAN_LIMITS = {
    FREE: { maxBranches: 1, maxUsers: 3, maxProducts: 100 },
    STARTER: { maxBranches: 3, maxUsers: 10, maxProducts: 500 },
    PROFESSIONAL: { maxBranches: 10, maxUsers: 50, maxProducts: 5000 },
    ENTERPRISE: { maxBranches: -1, maxUsers: -1, maxProducts: -1 } // Unlimited (-1)
};

@Schema({ timestamps: true })
export class Company {
    @Prop({ required: true })
    name: string;

    @Prop()
    address: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop()
    phone: string;

    @Prop()
    logo: string;

    @Prop()
    businessNiche: string;

    @Prop({ default: 'NGN' })
    currency: string;

    @Prop({ default: 'Africa/Lagos' })
    timezone: string;

    @Prop()
    taxId: string;

    @Prop()
    website: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    ownerId: string;

    // Subscription
    @Prop({ enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
    subscriptionPlan: SubscriptionPlan;

    @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
    subscriptionStatus: SubscriptionStatus;

    @Prop()
    subscriptionStartDate: Date;

    @Prop()
    subscriptionEndDate: Date;

    @Prop()
    trialEndsAt: Date;

    // Plan Limits (can be overridden per company)
    @Prop({ default: 1 })
    maxBranches: number;

    @Prop({ default: 3 })
    maxUsers: number;

    @Prop({ default: 100 })
    maxProducts: number;

    // Business Settings
    @Prop({
        type: Object,
        default: {
            lowStockThreshold: 10,
            enableDailyReports: true,
            enableWeeklyReports: true,
            enableLowStockAlerts: true,
            receiptFooter: 'Thank you for your business!',
            invoicePrefix: 'INV-',
            allowNegativeStock: false,
            requireCustomerForSale: false,
            defaultPaymentMethod: 'CASH',
            taxRate: 0,
            // Receipt Customization
            receiptHeader: '',
            showLogoOnReceipt: true,
            receiptWidth: '80mm',
            showStoreAddress: true,
            showStorePhone: true,
            showCustomerInfo: true,
            showSoldBy: true,
            receiptNote: ''
        }
    })
    settings: {
        lowStockThreshold: number;
        enableDailyReports: boolean;
        enableWeeklyReports: boolean;
        enableLowStockAlerts: boolean;
        receiptFooter: string;
        invoicePrefix: string;
        allowNegativeStock: boolean;
        requireCustomerForSale: boolean;
        defaultPaymentMethod: string;
        taxRate: number;
        // Receipt Customization
        receiptHeader: string;
        showLogoOnReceipt: boolean;
        receiptWidth: string;
        showStoreAddress: boolean;
        showStorePhone: boolean;
        showCustomerInfo: boolean;
        showSoldBy: boolean;
        receiptNote: string;
    };

    // Usage tracking
    @Prop({ default: 0 })
    currentBranchCount: number;

    @Prop({ default: 0 })
    currentUserCount: number;

    @Prop({ default: 0 })
    currentProductCount: number;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// Index for efficient lookups
CompanySchema.index({ email: 1 });
CompanySchema.index({ ownerId: 1 });

