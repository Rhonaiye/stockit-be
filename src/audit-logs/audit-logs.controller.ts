import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuditLogsService, AuditLogFilters } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditAction } from './schemas/audit-log.schema';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) { }

    @Get()
    async findAll(
        @Request() req,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '50',
        @Query('action') action?: AuditAction,
        @Query('entity') entity?: string,
        @Query('userId') userId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('suspicious') suspicious?: string
    ) {
        // Only OWNER and ADMIN can view audit logs
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            return { error: 'Unauthorized', statusCode: 403 };
        }

        const filters: AuditLogFilters = {};
        if (action) filters.action = action;
        if (entity) filters.entity = entity;
        if (userId) filters.userId = userId;
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);
        if (suspicious === 'true') filters.isSuspicious = true;

        return this.auditLogsService.findByCompany(
            req.user.companyId,
            filters,
            parseInt(page),
            parseInt(limit)
        );
    }

    @Get('suspicious')
    async getSuspicious(@Request() req) {
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            return { error: 'Unauthorized', statusCode: 403 };
        }

        return this.auditLogsService.findSuspiciousActivity(req.user.companyId);
    }

    @Get('stats')
    async getStats(@Request() req, @Query('days') days: string = '7') {
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            return { error: 'Unauthorized', statusCode: 403 };
        }

        return this.auditLogsService.getActivityStats(req.user.companyId, parseInt(days));
    }

    @Get('recent')
    async getRecent(@Request() req, @Query('limit') limit: string = '20') {
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            return { error: 'Unauthorized', statusCode: 403 };
        }

        return this.auditLogsService.getRecentActivity(req.user.companyId, parseInt(limit));
    }

    @Get('user/:userId')
    async getUserActivity(@Request() req, @Query('userId') userId: string) {
        if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
            return { error: 'Unauthorized', statusCode: 403 };
        }

        return this.auditLogsService.getUserActivity(userId);
    }
}
