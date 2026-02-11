
import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/schemas/user.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';

@Controller('invites')
export class InvitesController {
    constructor(
        private readonly invitesService: InvitesService,
        private readonly auditLogsService: AuditLogsService
    ) { }

    @Post('generate')
    @UseGuards(JwtAuthGuard)
    async generateLink(
        @Body() body: { role: UserRole; branchId?: string },
        @Request() req
    ) {
        // Only OWNER and ADMIN can generate links
        if (!['OWNER', 'ADMIN'].includes(req.user['role'])) {
            throw new BadRequestException('Unauthorized to generate invitation links');
        }

        const invite = await this.invitesService.createInvite(
            req.user.companyId,
            body.role,
            req.user['userId'],
            body.branchId === 'all' ? undefined : body.branchId
        );

        await this.auditLogsService.log({
            action: AuditAction.USER_INVITED, // Reuse USER_INVITED or create a new one
            entity: 'Invite',
            entityId: (invite as any)._id?.toString(),
            userId: req.user['userId'],
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { role: body.role, branchId: body.branchId, type: 'SHAREABLE_LINK' }
        });

        return {
            token: invite.token,
            expiresAt: invite.expiresAt
        };
    }
}
