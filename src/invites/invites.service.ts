
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invite, InviteDocument } from './schemas/invite.schema';
import * as crypto from 'crypto';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class InvitesService {
    constructor(@InjectModel(Invite.name) private inviteModel: Model<InviteDocument>) { }

    async createInvite(
        companyId: string,
        role: UserRole,
        createdBy: string,
        branchId?: string,
    ): Promise<Invite> {
        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Link valid for 7 days

        const invite = new this.inviteModel({
            token,
            companyId,
            role,
            branchId,
            expiresAt,
            createdBy,
        });

        return invite.save();
    }

    async validateInvite(token: string): Promise<InviteDocument> {
        const invite = await this.inviteModel.findOne({
            token,
            isUsed: false,
            expiresAt: { $gt: new Date() },
        }).exec();

        if (!invite) {
            throw new BadRequestException('Invalid or expired invitation link');
        }

        return invite;
    }

    async markAsUsed(token: string): Promise<void> {
        await this.inviteModel.updateOne({ token }, { isUsed: true }).exec();
    }
}
