
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProductDocument = Product & Document;

class ProductVariant {
    name: string;
    price: number;
    sku?: string;
}

@Schema({ timestamps: true })
export class Product {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    sku: string;

    @Prop()
    barcode: string;

    @Prop()
    category: string;

    @Prop({ required: true })
    costPrice: number;

    @Prop({ required: true })
    sellingPrice: number;

    @Prop()
    variants: ProductVariant[];

    @Prop({ required: true })
    companyId: string;

    // We could embedded stock here for read performance, e.g. { branchId: qty }
    // But strict normalization uses Inventory collection.
    // We'll follow the user's "Inventory Module" approach but maybe denormalize slightly for POS speed.
    // For now, simple.

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Supplier' })
    supplierId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
    branchId: string;

    @Prop()
    description: string;

    @Prop()
    imageUrl: string;

    @Prop()
    minStockLevel: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
// Compound index for unique SKU per company
ProductSchema.index({ companyId: 1, sku: 1 }, { unique: true });
