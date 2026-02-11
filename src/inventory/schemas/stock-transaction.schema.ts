
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StockTransactionDocument = StockTransaction & Document;

export enum TransactionType {
    STOCK_IN = 'STOCK_IN',
    STOCK_OUT = 'STOCK_OUT',
    ADJUSTMENT = 'ADJUSTMENT',
    TRANSFER = 'TRANSFER',
    SALE = 'SALE',
    RETURN = 'RETURN'
}

@Schema({ timestamps: true })
export class StockTransaction {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
    productId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
    branchId: string;

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true, enum: TransactionType })
    type: TransactionType;

    @Prop()
    reason: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    performedBy: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
    companyId: string;
}

export const StockTransactionSchema = SchemaFactory.createForClass(StockTransaction);
