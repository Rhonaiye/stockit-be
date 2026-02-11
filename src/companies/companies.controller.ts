import { Controller, Get, Patch, Body, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
    constructor(
        private readonly companiesService: CompaniesService,
        private readonly auditLogsService: AuditLogsService
    ) { }

    // ====== PROFILE ENDPOINTS ======

    @Get('profile')
    async getProfile(@Request() req) {
        const company = await this.companiesService.findById(req.user.companyId);
        if (!company) {
            throw new BadRequestException('Company not found');
        }
        return company;
    }

    @Patch('profile')
    async updateProfile(@Body() updateData: any, @Request() req) {
        // Only OWNER can update company profile
        if (req.user.role !== 'OWNER') {
            throw new BadRequestException('Only company owner can update profile');
        }

        const company = await this.companiesService.updateProfile(req.user.companyId, updateData);

        await this.auditLogsService.log({
            action: AuditAction.COMPANY_UPDATED,
            entity: 'Company',
            entityId: req.user.companyId,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { updatedFields: Object.keys(updateData) }
        });

        return company;
    }

    // ====== SETTINGS ENDPOINTS ======

    @Get('settings')
    async getSettings(@Request() req) {
        // OWNER and ADMIN can view settings
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            throw new BadRequestException('Unauthorized to view settings');
        }

        return this.companiesService.getSettings(req.user.companyId);
    }

    @Patch('settings')
    async updateSettings(@Body() settings: any, @Request() req) {
        // Only OWNER can update settings
        if (req.user.role !== 'OWNER') {
            throw new BadRequestException('Only company owner can update settings');
        }

        const company = await this.companiesService.updateSettings(req.user.companyId, settings);

        await this.auditLogsService.log({
            action: AuditAction.SETTINGS_UPDATED,
            entity: 'Company',
            entityId: req.user.companyId,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { updatedSettings: Object.keys(settings) }
        });

        return company.settings;
    }

    // ====== SUBSCRIPTION ENDPOINTS ======

    @Get('subscription')
    async getSubscription(@Request() req) {
        // OWNER and ADMIN can view subscription
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            throw new BadRequestException('Unauthorized to view subscription');
        }

        return this.companiesService.getSubscriptionStatus(req.user.companyId);
    }

    // ====== PLAN LIMITS ENDPOINTS ======

    @Get('limits')
    async getPlanLimits(@Request() req) {
        const subscription = await this.companiesService.getSubscriptionStatus(req.user.companyId);
        return {
            limits: subscription.limits,
            usage: subscription.usage,
            canAddBranch: await this.companiesService.canAddBranch(req.user.companyId),
            canAddUser: await this.companiesService.canAddUser(req.user.companyId),
            canAddProduct: await this.companiesService.canAddProduct(req.user.companyId)
        };
    }

    @Patch('danger/purge')
    async purgeWorkspace(@Request() req) {
        // Only OWNER can delete the workspace
        if (req.user.role !== 'OWNER') {
            throw new BadRequestException('Only workspace owners can initiate a data purge');
        }

        await this.companiesService.deleteCompany(req.user.companyId);

        await this.auditLogsService.log({
            action: AuditAction.COMPANY_DELETED,
            entity: 'Company',
            entityId: req.user.companyId,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { action: 'WORKSPACE_PERMANENT_PURGE' }
        });

        return { message: 'Workspace and all associated data have been purged successfully' };
    }
}
