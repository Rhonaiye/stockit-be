import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BranchesService } from '../branches/branches.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private branchesService: BranchesService,
        private jwtService: JwtService,
        private auditLogsService: AuditLogsService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        if (user && await bcrypt.compare(pass, user.password)) {
            const userObj = user.toObject();
            const { password, ...result } = userObj;
            return result;
        }

        // Log failed login attempt if user exists
        if (user) {
            await this.auditLogsService.log({
                action: AuditAction.LOGIN_FAILED,
                entity: 'User',
                entityId: user._id.toString(),
                userId: user._id.toString(),
                userName: user.email,
                companyId: user.companyId,
                details: { reason: 'Invalid password' }
            });
        }

        return null;
    }

    async login(user: any) {
        const branchCount = await this.branchesService.countByCompany(user.companyId);
        const needsOnboarding = user.role === 'OWNER' && branchCount === 0;

        const payload = {
            email: user.email,
            sub: user._id,
            role: user.role,
            companyId: user.companyId,
            branchId: user.branchId,
            needsOnboarding: needsOnboarding
        };

        // Update login stats
        await this.usersService.recordLogin(user._id.toString());

        // Log successful login
        await this.auditLogsService.log({
            action: AuditAction.LOGIN,
            entity: 'User',
            entityId: user._id.toString(),
            userId: user._id.toString(),
            userName: user.email,
            companyId: user.companyId,
            branchId: user.branchId,
            details: { role: user.role }
        });

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                branchId: user.branchId,
                needsOnboarding: needsOnboarding
            }
        };
    }
}
