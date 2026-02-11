import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StockReceiptDocument = StockReceipt & Document;

export enum ReceiptStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    REJECTED = 'REJECTED'
}

@Schema({ timestamps: true })
export class StockReceipt {
    @Prop({ required: true, unique: true })
    receiptNumber: string; // Auto-generated or supplier invoice number

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Supplier' })
    supplierId: string;

    @Prop()
    supplierInvoiceNumber: string; // External invoice reference

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
    branchId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
    companyId: string;

    @Prop({
        type: [{
            productId: { type: MongooseSchema.Types.ObjectId, ref: 'Product' },
            productName: String,
            quantity: Number,
            costPerUnit: Number,
            expiryDate: Date,
            batchNumber: String
        }], required: true
    })
    items: {
        productId: string;
        productName: string;
        quantity: number;
        costPerUnit: number;
        expiryDate?: Date;
        batchNumber?: string;
    }[];

    @Prop({ default: 0 })
    totalAmount: number;

    @Prop({ enum: ReceiptStatus, default: ReceiptStatus.PENDING })
    status: ReceiptStatus;

    @Prop()
    notes: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    receivedBy: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    verifiedBy: string;

    @Prop()
    receivedDate: Date;

    @Prop()
    verifiedDate: Date;
}

export const StockReceiptSchema = SchemaFactory.createForClass(StockReceipt);
StockReceiptSchema.index({ companyId: 1, receiptNumber: 1 }, { unique: true });
