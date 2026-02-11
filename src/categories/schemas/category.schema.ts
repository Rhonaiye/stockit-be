
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
    @Prop({ required: true })
    name: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    companyId: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ companyId: 1, name: 1 }, { unique: true });
