import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';
import { UserRole, UserStatus } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly auditLogsService: AuditLogsService
    ) { }

    @Post()
    async create(@Body() createUserDto: CreateUserDto, @Request() req) {
        // Ensure companyId is set from JWT
        createUserDto.companyId = req.user.companyId;

        const user = await this.usersService.create(createUserDto);

        // Log the action
        await this.auditLogsService.log({
            action: AuditAction.USER_CREATED,
            entity: 'User',
            entityId: (user as any)._id?.toString(),
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { name: user.name, email: user.email, role: user.role }
        });

        return user;
    }

    @Get()
    findAll(@Request() req) {
        const companyId = req.user.companyId;
        return this.usersService.findAll(companyId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        const user = await this.usersService.findById(id);
        if (!user || user.companyId !== req.user.companyId) {
            throw new BadRequestException('User not found');
        }
        return user;
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateData: Partial<CreateUserDto>, @Request() req) {
        // Don't allow updating companyId
        delete updateData.companyId;

        const user = await this.usersService.update(id, updateData);

        await this.auditLogsService.log({
            action: AuditAction.USER_UPDATED,
            entity: 'User',
            entityId: id,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { updatedFields: Object.keys(updateData) }
        });

        return user;
    }

    // ====== INVITATION ENDPOINTS ======

    @Post('invite')
    async inviteUser(
        @Body() body: { email: string; name: string; role: UserRole; branchId?: string },
        @Request() req
    ) {
        // Only OWNER and ADMIN can invite
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            throw new BadRequestException('Unauthorized to invite users');
        }

        const { user, inviteToken } = await this.usersService.inviteUser(
            body.email,
            body.name,
            body.role,
            req.user.companyId,
            body.branchId,
            req.user.sub
        );

        await this.auditLogsService.log({
            action: AuditAction.USER_INVITED,
            entity: 'User',
            entityId: (user as any)._id?.toString(),
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { invitedEmail: body.email, role: body.role }
        });

        // In production, you'd send an email with the invite link
        // For now, return the token for testing
        return {
            message: 'Invitation sent successfully',
            user,
            // Remove this in production - just for testing
            inviteLink: `/accept-invite?token=${inviteToken}`
        };
    }

    // ====== SUSPENSION ENDPOINTS ======

    @Patch(':id/suspend')
    async suspendUser(
        @Param('id') id: string,
        @Body() body: { reason: string },
        @Request() req
    ) {
        // Only OWNER and ADMIN can suspend
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            throw new BadRequestException('Unauthorized to suspend users');
        }

        // Can't suspend yourself
        if (id === req.user.sub) {
            throw new BadRequestException('Cannot suspend yourself');
        }

        const user = await this.usersService.suspendUser(id, body.reason, req.user.sub);

        await this.auditLogsService.log({
            action: AuditAction.USER_SUSPENDED,
            entity: 'User',
            entityId: id,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { reason: body.reason, suspendedUser: user.email }
        });

        return user;
    }

    @Patch(':id/activate')
    async activateUser(@Param('id') id: string, @Request() req) {
        // Only OWNER and ADMIN can activate
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            throw new BadRequestException('Unauthorized to activate users');
        }

        const user = await this.usersService.activateUser(id);

        await this.auditLogsService.log({
            action: AuditAction.USER_ACTIVATED,
            entity: 'User',
            entityId: id,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { activatedUser: user.email }
        });

        return user;
    }

    // ====== ACTIVITY ENDPOINTS ======

    @Get(':id/activity')
    async getUserActivity(@Param('id') id: string, @Request() req) {
        // Only OWNER and ADMIN can view user activity
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            throw new BadRequestException('Unauthorized to view user activity');
        }

        return this.auditLogsService.getUserActivity(id);
    }

    // ====== NOTIFICATION PREFERENCES ======

    @Patch('preferences/notifications')
    async updateNotificationPreferences(
        @Body() preferences: Record<string, boolean>,
        @Request() req
    ) {
        return this.usersService.updateNotificationPreferences(req.user.sub, preferences);
    }

    @Get('me/preferences')
    async getMyPreferences(@Request() req) {
        const user = await this.usersService.findById(req.user.sub);
        return user?.notificationPreferences;
    }

    @Patch('me/delete')
    async deleteAccount(@Request() req) {
        // Can't delete if OWNER (they must delete company instead)
        if (req.user.role === 'OWNER') {
            throw new BadRequestException('Workspace Owners cannot delete their account without deleting the entire Workspace. Please use the Workspace Deletion tool.');
        }

        await this.usersService.delete(req.user.sub);

        await this.auditLogsService.log({
            action: AuditAction.USER_DELETED,
            entity: 'User',
            entityId: req.user.sub,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { action: 'ACCOUNT_SELF_DELETION' }
        });

        return { message: 'Account deleted successfully' };
    }

    @Delete(':id')
    async removeUser(@Param('id') id: string, @Request() req) {
        // Only OWNER and ADMIN can delete users
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            throw new BadRequestException('Unauthorized to delete users');
        }

        // Can't delete yourself using this endpoint (use me/delete)
        if (id === req.user.sub) {
            throw new BadRequestException('Cannot delete yourself via this endpoint');
        }

        const user = await this.usersService.findById(id);
        if (!user || user.companyId !== req.user.companyId) {
            throw new BadRequestException('User not found');
        }

        await this.usersService.delete(id);

        await this.auditLogsService.log({
            action: AuditAction.USER_DELETED,
            entity: 'User',
            entityId: id,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { deletedUserEmail: user.email, deletedUserName: user.name }
        });

        return { message: 'User deleted successfully' };
    }
}

