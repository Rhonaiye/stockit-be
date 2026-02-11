
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema()
class SaleItem {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product' })
    productId: string;

    @Prop()
    productName: string;

    @Prop()
    variantName: string;

    @Prop()
    quantity: number;

    @Prop()
    price: number;
}

const SaleItemSchema = SchemaFactory.createForClass(SaleItem);

@Schema({ timestamps: true })
export class Sale {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
    companyId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
    branchId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer' })
    customerId: string;

    @Prop({ type: [SaleItemSchema] })
    items: SaleItem[];

    @Prop({ required: true })
    totalAmount: number;

    @Prop({ required: true })
    paidAmount: number; // For partial payments / credit

    @Prop({ required: true, enum: ['CASH', 'POS', 'TRANSFER', 'CREDIT', 'SPLIT'] })
    paymentMethod: string;

    @Prop({ default: 'COMPLETED' })
    status: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    soldBy: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
