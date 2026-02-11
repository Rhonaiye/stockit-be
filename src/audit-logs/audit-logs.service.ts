import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction } from './schemas/audit-log.schema';

export interface CreateAuditLogDto {
    action: AuditAction;
    entity: string;
    entityId?: string;
    userId: string;
    userName: string;
    companyId: string;
    branchId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export interface AuditLogFilters {
    action?: AuditAction;
    entity?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    isSuspicious?: boolean;
}

@Injectable()
export class AuditLogsService {
    constructor(
        @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>
    ) { }

    async log(dto: CreateAuditLogDto): Promise<AuditLog | null> {
        try {
            // Check for suspicious activity patterns
            const suspicious = await this.detectSuspiciousActivity(dto);

            const auditLog = new this.auditLogModel({
                ...dto,
                userName: dto.userName || 'System/Unknown',
                ipAddress: dto.ipAddress || '0.0.0.0',
                isSuspicious: suspicious.isSuspicious,
                suspiciousReason: suspicious.reason
            });

            return await auditLog.save();
        } catch (error) {
            console.error('CRITICAL: Failed to save audit log:', error);
            // Non-blocking failure - don't stop the main business transaction
            return null;
        }
    }

    async findByCompany(
        companyId: string,
        filters: AuditLogFilters = {},
        page: number = 1,
        limit: number = 50
    ): Promise<{ logs: AuditLog[]; total: number; pages: number }> {
        const query: any = { companyId };

        if (filters.action) query.action = filters.action;
        if (filters.entity) query.entity = filters.entity;
        if (filters.userId) query.userId = filters.userId;
        if (filters.isSuspicious !== undefined) query.isSuspicious = filters.isSuspicious;

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = filters.startDate;
            if (filters.endDate) query.createdAt.$lte = filters.endDate;
        }

        const [logs, total] = await Promise.all([
            this.auditLogModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .exec(),
            this.auditLogModel.countDocuments(query)
        ]);

        return {
            logs,
            total,
            pages: Math.ceil(total / limit)
        };
    }

    async findSuspiciousActivity(companyId: string): Promise<AuditLog[]> {
        return this.auditLogModel
            .find({ companyId, isSuspicious: true })
            .sort({ createdAt: -1 })
            .limit(100)
            .exec();
    }

    async getUserActivity(userId: string, limit: number = 50): Promise<AuditLog[]> {
        return this.auditLogModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }

    async getRecentActivity(companyId: string, limit: number = 20): Promise<AuditLog[]> {
        return this.auditLogModel
            .find({ companyId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }

    private async detectSuspiciousActivity(dto: CreateAuditLogDto): Promise<{ isSuspicious: boolean; reason?: string }> {
        // Check for multiple failed logins
        if (dto.action === AuditAction.LOGIN_FAILED) {
            const recentFailures = await this.auditLogModel.countDocuments({
                userId: dto.userId,
                action: AuditAction.LOGIN_FAILED,
                createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 mins
            });

            if (recentFailures >= 3) {
                return { isSuspicious: true, reason: 'Multiple failed login attempts' };
            }
        }

        // Check for unusual bulk operations
        if (dto.action === AuditAction.BULK_OPERATION || dto.action === AuditAction.DATA_EXPORTED) {
            return { isSuspicious: true, reason: 'Sensitive bulk operation performed' };
        }

        // Check for rapid deletions
        if (dto.action.includes('DELETED')) {
            const recentDeletions = await this.auditLogModel.countDocuments({
                userId: dto.userId,
                action: { $regex: /DELETED$/ },
                createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 mins
            });

            if (recentDeletions >= 5) {
                return { isSuspicious: true, reason: 'Multiple rapid deletions detected' };
            }
        }

        // Check for off-hours activity (configurable)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            // Log but don't flag as suspicious by default
        }

        return { isSuspicious: false };
    }

    async getActivityStats(companyId: string, days: number = 7): Promise<any> {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const stats = await this.auditLogModel.aggregate([
            { $match: { companyId, createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const suspiciousCount = await this.auditLogModel.countDocuments({
            companyId,
            isSuspicious: true,
            createdAt: { $gte: startDate }
        });

        return { actionBreakdown: stats, suspiciousCount, period: `${days} days` };
    }
}
