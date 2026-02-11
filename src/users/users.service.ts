
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument, UserStatus } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
        const createdUser = new this.userModel({ ...createUserDto, password: hashedPassword });
        return createdUser.save();
    }

    async findAll(companyId: string): Promise<User[]> {
        return this.userModel.find({ companyId }).exec();
    }

    async findOne(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).select('+password').exec();
    }

    async findById(id: string): Promise<UserDocument | null> {
        return this.userModel.findById(id).exec();
    }

    async update(id: string, updateData: Partial<User>): Promise<User> {
        const user = await this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    // ====== INVITATION SYSTEM ======

    async inviteUser(
        email: string,
        name: string,
        role: string,
        companyId: string,
        branchId: string | undefined,
        invitedById: string
    ): Promise<{ user: User; inviteToken: string }> {
        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email }).exec();
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create temp password (user will set their own on acceptance)
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const user = new this.userModel({
            name,
            email,
            password: hashedPassword,
            role,
            companyId,
            branchId,
            status: UserStatus.PENDING_INVITE,
            invitedBy: invitedById,
            invitedAt: new Date(),
            inviteToken,
            inviteTokenExpires
        });

        await user.save();
        return { user, inviteToken };
    }

    async acceptInvite(token: string, password: string): Promise<User> {
        const user = await this.userModel.findOne({
            inviteToken: token,
            inviteTokenExpires: { $gt: new Date() },
            status: UserStatus.PENDING_INVITE
        }).exec();

        if (!user) {
            throw new BadRequestException('Invalid or expired invite token');
        }

        // Set user's chosen password
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        user.password = hashedPassword;
        user.status = UserStatus.ACTIVE;
        user.inviteToken = undefined;
        user.inviteTokenExpires = undefined;

        return user.save();
    }

    // ====== SUSPENSION SYSTEM ======

    async suspendUser(userId: string, reason: string, suspendedById: string): Promise<User> {
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');

        if (user.status === UserStatus.SUSPENDED) {
            throw new BadRequestException('User is already suspended');
        }

        user.status = UserStatus.SUSPENDED;
        user.suspendedAt = new Date();
        user.suspendedBy = suspendedById;
        user.suspendedReason = reason;

        return user.save();
    }

    async activateUser(userId: string): Promise<User> {
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');

        user.status = UserStatus.ACTIVE;
        user.suspendedAt = undefined;
        user.suspendedBy = undefined;
        user.suspendedReason = undefined;

        return user.save();
    }

    async deactivateUser(userId: string): Promise<User> {
        return this.update(userId, { status: UserStatus.INACTIVE });
    }

    // ====== ACTIVITY TRACKING ======

    async recordLogin(userId: string): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, {
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
            $inc: { loginCount: 1 }
        }).exec();
    }

    async recordActivity(userId: string): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, {
            lastActivityAt: new Date()
        }).exec();
    }

    // ====== NOTIFICATION PREFERENCES ======

    async updateNotificationPreferences(
        userId: string,
        preferences: Partial<User['notificationPreferences']>
    ): Promise<User> {
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');

        user.notificationPreferences = {
            ...user.notificationPreferences,
            ...preferences
        };

        return user.save();
    }

    // ====== PASSWORD RESET ======

    async createPasswordResetToken(email: string): Promise<string | null> {
        const user = await this.userModel.findOne({ email }).exec();
        if (!user) return null;

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await user.save();
        return resetToken;
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        const user = await this.userModel.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() }
        }).exec();

        if (!user) return false;

        const salt = await bcrypt.genSalt();
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();
        return true;
    }

    // ====== UTILITY METHODS ======

    async getUsersByStatus(companyId: string, status: UserStatus): Promise<User[]> {
        return this.userModel.find({ companyId, status }).exec();
    }

    async countByCompany(companyId: string): Promise<number> {
        return this.userModel.countDocuments({ companyId }).exec();
    }

    async delete(id: string): Promise<void> {
        const result = await this.userModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException('User not found');
    }
}

