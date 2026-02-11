
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
    @Prop({ required: true })
    name: string;

    @Prop()
    contactPerson: string;

    @Prop()
    email: string;

    @Prop()
    phone: string;

    @Prop()
    address: string;

    @Prop()
    category: string; // e.g., Electronics, Food, etc.

    @Prop({ default: 'ACTIVE' })
    status: string; // ACTIVE, INACTIVE

    @Prop()
    paymentTerms: string; // e.g., Net 30, Pay on Delivery

    @Prop()
    notes: string;

    @Prop({ required: true })
    companyId: string;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
SupplierSchema.index({ companyId: 1, name: 1 });
