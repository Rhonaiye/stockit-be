
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type InventoryDocument = Inventory & Document;

@Schema({ timestamps: true })
export class Inventory {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
    productId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
    branchId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
    companyId: string;

    @Prop({ default: 0 })
    quantity: number;

    @Prop({ default: 0 })
    lowStockThreshold: number;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
InventorySchema.index({ productId: 1, branchId: 1 }, { unique: true });
