
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Company, CompanyDocument, SubscriptionPlan, SubscriptionStatus, PLAN_LIMITS } from './schemas/company.schema';

@Injectable()
export class CompaniesService {
    constructor(
        @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
        @InjectConnection() private connection: Connection
    ) { }

    async create(name: string, email: string): Promise<CompanyDocument> {
        // Set trial period (14 days)
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        const createdCompany = new this.companyModel({
            name,
            email,
            subscriptionPlan: SubscriptionPlan.FREE,
            subscriptionStatus: SubscriptionStatus.TRIAL,
            subscriptionStartDate: new Date(),
            trialEndsAt,
            maxBranches: PLAN_LIMITS.FREE.maxBranches,
            maxUsers: PLAN_LIMITS.FREE.maxUsers,
            maxProducts: PLAN_LIMITS.FREE.maxProducts
        });
        return createdCompany.save();
    }

    async findById(id: string): Promise<CompanyDocument | null> {
        return this.companyModel.findById(id).exec();
    }

    async findByEmail(email: string): Promise<CompanyDocument | null> {
        return this.companyModel.findOne({ email }).exec();
    }

    // ====== PROFILE MANAGEMENT ======

    async updateProfile(id: string, updateData: Partial<Company>): Promise<Company> {
        // Prevent updating sensitive fields through this method
        delete (updateData as any).subscriptionPlan;
        delete (updateData as any).subscriptionStatus;
        delete (updateData as any).maxBranches;
        delete (updateData as any).maxUsers;
        delete (updateData as any).maxProducts;
        delete (updateData as any).ownerId;

        const company = await this.companyModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        if (!company) throw new NotFoundException('Company not found');
        return company;
    }

    // ====== SETTINGS MANAGEMENT ======

    async updateSettings(id: string, settings: Partial<Company['settings']>): Promise<Company> {
        const company = await this.companyModel.findById(id).exec();
        if (!company) throw new NotFoundException('Company not found');

        company.settings = {
            ...company.settings,
            ...settings
        };

        return company.save();
    }

    async getSettings(id: string): Promise<Company['settings']> {
        const company = await this.companyModel.findById(id).exec();
        if (!company) throw new NotFoundException('Company not found');
        return company.settings;
    }

    // ====== SUBSCRIPTION MANAGEMENT ======

    async getSubscriptionStatus(id: string): Promise<{
        plan: SubscriptionPlan;
        status: SubscriptionStatus;
        startDate: Date;
        endDate?: Date;
        trialEndsAt?: Date;
        limits: { branches: number; users: number; products: number };
        usage: { branches: number; users: number; products: number };
    }> {
        const company = await this.companyModel.findById(id).exec();
        if (!company) throw new NotFoundException('Company not found');

        return {
            plan: company.subscriptionPlan,
            status: company.subscriptionStatus,
            startDate: company.subscriptionStartDate,
            endDate: company.subscriptionEndDate,
            trialEndsAt: company.trialEndsAt,
            limits: {
                branches: company.maxBranches,
                users: company.maxUsers,
                products: company.maxProducts
            },
            usage: {
                branches: company.currentBranchCount,
                users: company.currentUserCount,
                products: company.currentProductCount
            }
        };
    }

    async upgradePlan(id: string, newPlan: SubscriptionPlan): Promise<Company> {
        const company = await this.companyModel.findById(id).exec();
        if (!company) throw new NotFoundException('Company not found');

        const limits = PLAN_LIMITS[newPlan];

        company.subscriptionPlan = newPlan;
        company.subscriptionStatus = SubscriptionStatus.ACTIVE;
        company.subscriptionStartDate = new Date();
        company.maxBranches = limits.maxBranches;
        company.maxUsers = limits.maxUsers;
        company.maxProducts = limits.maxProducts;

        return company.save();
    }

    // ====== PLAN ENFORCEMENT ======

    async canAddBranch(companyId: string): Promise<boolean> {
        const company = await this.companyModel.findById(companyId).exec();
        if (!company) return false;

        // -1 means unlimited
        if (company.maxBranches === -1) return true;
        return company.currentBranchCount < company.maxBranches;
    }

    async canAddUser(companyId: string): Promise<boolean> {
        const company = await this.companyModel.findById(companyId).exec();
        if (!company) return false;

        if (company.maxUsers === -1) return true;
        return company.currentUserCount < company.maxUsers;
    }

    async canAddProduct(companyId: string): Promise<boolean> {
        const company = await this.companyModel.findById(companyId).exec();
        if (!company) return false;

        if (company.maxProducts === -1) return true;
        return company.currentProductCount < company.maxProducts;
    }

    // ====== USAGE TRACKING ======

    async incrementBranchCount(companyId: string): Promise<void> {
        await this.companyModel.findByIdAndUpdate(companyId, {
            $inc: { currentBranchCount: 1 }
        }).exec();
    }

    async decrementBranchCount(companyId: string): Promise<void> {
        await this.companyModel.findByIdAndUpdate(companyId, {
            $inc: { currentBranchCount: -1 }
        }).exec();
    }

    async incrementUserCount(companyId: string): Promise<void> {
        await this.companyModel.findByIdAndUpdate(companyId, {
            $inc: { currentUserCount: 1 }
        }).exec();
    }

    async decrementUserCount(companyId: string): Promise<void> {
        await this.companyModel.findByIdAndUpdate(companyId, {
            $inc: { currentUserCount: -1 }
        }).exec();
    }

    async incrementProductCount(companyId: string): Promise<void> {
        await this.companyModel.findByIdAndUpdate(companyId, {
            $inc: { currentProductCount: 1 }
        }).exec();
    }

    async decrementProductCount(companyId: string): Promise<void> {
        await this.companyModel.findByIdAndUpdate(companyId, {
            $inc: { currentProductCount: -1 }
        }).exec();
    }

    async recalculateUsage(companyId: string, counts: { branches: number; users: number; products: number }): Promise<void> {
        await this.companyModel.findByIdAndUpdate(companyId, {
            currentBranchCount: counts.branches,
            currentUserCount: counts.users,
            currentProductCount: counts.products
        }).exec();
    }

    async deleteCompany(id: string): Promise<void> {
        const company = await this.companyModel.findById(id).exec();
        if (!company) throw new NotFoundException('Company not found');

        // Cascade delete all related data using raw collection access
        const collections = [
            'users',
            'products',
            'sales',
            'branches',
            'categories',
            'suppliers',
            'auditlogs',
            'stocktransactions',
            'stockreceipts'
        ];

        for (const collectionName of collections) {
            try {
                await this.connection.collection(collectionName).deleteMany({ companyId: id });
            } catch (error) {
                // Collection might not exist, continue
                console.log(`Skipping collection ${collectionName}: ${error.message}`);
            }
        }

        // Finally delete the company
        await this.companyModel.findByIdAndDelete(id).exec();
    }
}

