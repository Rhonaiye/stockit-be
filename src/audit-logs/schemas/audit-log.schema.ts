import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditAction {
    // Auth
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    LOGIN_FAILED = 'LOGIN_FAILED',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',

    // Users
    USER_CREATED = 'USER_CREATED',
    USER_UPDATED = 'USER_UPDATED',
    USER_INVITED = 'USER_INVITED',
    USER_SUSPENDED = 'USER_SUSPENDED',
    USER_ACTIVATED = 'USER_ACTIVATED',
    USER_DELETED = 'USER_DELETED',

    // Products
    PRODUCT_CREATED = 'PRODUCT_CREATED',
    PRODUCT_UPDATED = 'PRODUCT_UPDATED',
    PRODUCT_DELETED = 'PRODUCT_DELETED',

    // Inventory
    STOCK_ADJUSTED = 'STOCK_ADJUSTED',
    STOCK_RECEIPT_CREATED = 'STOCK_RECEIPT_CREATED',
    STOCK_RECEIPT_VERIFIED = 'STOCK_RECEIPT_VERIFIED',
    STOCK_RECEIPT_REJECTED = 'STOCK_RECEIPT_REJECTED',

    // Sales
    SALE_CREATED = 'SALE_CREATED',
    SALE_REFUNDED = 'SALE_REFUNDED',
    SALE_VOIDED = 'SALE_VOIDED',

    // Customers
    CUSTOMER_CREATED = 'CUSTOMER_CREATED',
    CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
    CUSTOMER_DELETED = 'CUSTOMER_DELETED',
    CUSTOMER_CREDIT_UPDATED = 'CUSTOMER_CREDIT_UPDATED',

    // Company
    COMPANY_UPDATED = 'COMPANY_UPDATED',
    COMPANY_DELETED = 'COMPANY_DELETED',
    SETTINGS_UPDATED = 'SETTINGS_UPDATED',

    // Branches
    BRANCH_CREATED = 'BRANCH_CREATED',
    BRANCH_UPDATED = 'BRANCH_UPDATED',
    BRANCH_DELETED = 'BRANCH_DELETED',

    // System
    DATA_EXPORTED = 'DATA_EXPORTED',
    BULK_OPERATION = 'BULK_OPERATION',
}

@Schema({ timestamps: true })
export class AuditLog {
    @Prop({ required: true, enum: AuditAction })
    action: AuditAction;

    @Prop({ required: true })
    entity: string; // e.g., 'User', 'Product', 'Sale'

    @Prop()
    entityId: string; // ID of the affected entity

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: string;

    @Prop({ required: true })
    userName: string; // Denormalized for quick display

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
    companyId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
    branchId: string;

    @Prop({ type: Object })
    details: Record<string, any>; // Additional context (old/new values, etc.)

    @Prop()
    ipAddress: string;

    @Prop()
    userAgent: string;

    @Prop({ default: false })
    isSuspicious: boolean; // Flag for potentially suspicious activity

    @Prop()
    suspiciousReason: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Create indexes for efficient querying
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, companyId: 1 });
AuditLogSchema.index({ isSuspicious: 1, companyId: 1 });
