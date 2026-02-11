
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { UserRole } from '../../users/schemas/user.schema';

export type InviteDocument = Invite & Document;

@Schema({ timestamps: true })
export class Invite {
    @Prop({ required: true, unique: true })
    token: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
    companyId: string;

    @Prop({ enum: UserRole, required: true })
    role: UserRole;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: false })
    branchId: string;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ default: false })
    isUsed: boolean;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    createdBy: string;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
InviteSchema.index({ token: 1 });
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
