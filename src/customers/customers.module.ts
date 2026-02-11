
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Module, Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, Injectable, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';

// =============== SCHEMA ===============

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
    @Prop({ required: true })
    name: string;

    @Prop()
    email: string;

    @Prop()
    phone: string;

    @Prop()
    address: string;

    @Prop({ required: true })
    companyId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
    branchId: string;

    // Credit System
    @Prop({ default: 0 })
    creditBalance: number;

    @Prop({ default: 0 })
    creditLimit: number;

    // Purchase History Stats (denormalized for quick access)
    @Prop({ default: 0 })
    totalPurchases: number;

    @Prop({ default: 0 })
    totalSpent: number;

    @Prop()
    lastPurchaseDate: Date;

    @Prop({ default: 0 })
    averageOrderValue: number;

    // Loyalty
    @Prop({ default: 0 })
    loyaltyPoints: number;

    @Prop({ default: 'REGULAR', enum: ['REGULAR', 'VIP', 'PREMIUM'] })
    tier: string;

    // Additional Info
    @Prop()
    notes: string;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({ default: true })
    isActive: boolean;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ companyId: 1, name: 'text' });
CustomerSchema.index({ companyId: 1, phone: 1 });
CustomerSchema.index({ companyId: 1, email: 1 });

// =============== SERVICE ===============

@Injectable()
export class CustomersService {
    constructor(@InjectModel(Customer.name) private model: Model<CustomerDocument>) { }

    async create(dto: any): Promise<Customer> {
        return new this.model(dto).save();
    }

    async findAll(companyId: string, filters?: { search?: string; tier?: string; hasCredit?: boolean }): Promise<Customer[]> {
        const query: any = { companyId };

        if (filters?.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: 'i' } },
                { phone: { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } }
            ];
        }

        if (filters?.tier) {
            query.tier = filters.tier;
        }

        if (filters?.hasCredit) {
            query.creditBalance = { $gt: 0 };
        }

        return this.model.find(query).sort({ name: 1 }).exec();
    }

    async findById(id: string): Promise<Customer | null> {
        return this.model.findById(id).exec();
    }

    async update(id: string, dto: Partial<Customer>): Promise<Customer> {
        const customer = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!customer) throw new NotFoundException('Customer not found');
        return customer;
    }

    async delete(id: string): Promise<void> {
        await this.model.findByIdAndDelete(id).exec();
    }

    // ====== CREDIT MANAGEMENT ======

    async updateCreditBalance(customerId: string, amount: number, operation: 'ADD' | 'DEDUCT'): Promise<Customer> {
        const customer = await this.model.findById(customerId).exec();
        if (!customer) throw new NotFoundException('Customer not found');

        if (operation === 'ADD') {
            customer.creditBalance += amount;
        } else {
            customer.creditBalance = Math.max(0, customer.creditBalance - amount);
        }

        return customer.save();
    }

    async getCustomersWithCredit(companyId: string): Promise<Customer[]> {
        return this.model.find({ companyId, creditBalance: { $gt: 0 } }).sort({ creditBalance: -1 }).exec();
    }

    // ====== PURCHASE RECORDING ======

    async recordPurchase(customerId: string, amount: number): Promise<Customer> {
        const customer = await this.model.findById(customerId).exec();
        if (!customer) throw new NotFoundException('Customer not found');

        customer.totalPurchases += 1;
        customer.totalSpent += amount;
        customer.lastPurchaseDate = new Date();
        customer.averageOrderValue = customer.totalSpent / customer.totalPurchases;

        // Award loyalty points (1 point per 100 currency units)
        customer.loyaltyPoints += Math.floor(amount / 100);

        // Update tier based on total spent
        if (customer.totalSpent >= 500000) {
            customer.tier = 'PREMIUM';
        } else if (customer.totalSpent >= 100000) {
            customer.tier = 'VIP';
        }

        return customer.save();
    }

    // ====== INSIGHTS ======

    async getCustomerInsights(customerId: string): Promise<any> {
        const customer = await this.model.findById(customerId).exec();
        if (!customer) throw new NotFoundException('Customer not found');

        const daysSinceLastPurchase = customer.lastPurchaseDate
            ? Math.floor((Date.now() - new Date(customer.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        return {
            customer,
            insights: {
                totalPurchases: customer.totalPurchases,
                totalSpent: customer.totalSpent,
                averageOrderValue: customer.averageOrderValue,
                loyaltyPoints: customer.loyaltyPoints,
                tier: customer.tier,
                creditBalance: customer.creditBalance,
                daysSinceLastPurchase,
                isAtRisk: daysSinceLastPurchase !== null && daysSinceLastPurchase > 30,
                recommendations: []
            }
        };
    }

    async getTopCustomers(companyId: string, limit: number = 10): Promise<Customer[]> {
        return this.model.find({ companyId }).sort({ totalSpent: -1 }).limit(limit).exec();
    }

    async getCompanyStats(companyId: string): Promise<any> {
        const customers = await this.model.find({ companyId }).exec();

        const totalCustomers = customers.length;
        const totalCreditOutstanding = customers.reduce((sum, c) => sum + c.creditBalance, 0);
        const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
        const activeCustomers = customers.filter(c => {
            if (!c.lastPurchaseDate) return false;
            const daysSince = (Date.now() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 30;
        }).length;

        return {
            totalCustomers,
            totalCreditOutstanding,
            totalRevenue,
            activeCustomers,
            inactiveCustomers: totalCustomers - activeCustomers,
            vipCount: customers.filter(c => c.tier === 'VIP').length,
            premiumCount: customers.filter(c => c.tier === 'PREMIUM').length
        };
    }
}

// =============== CONTROLLER ===============

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
    constructor(
        private service: CustomersService,
        private auditLogsService: AuditLogsService
    ) { }

    @Post()
    async create(@Body() dto: any, @Request() req) {
        const customer = await this.service.create({ ...dto, companyId: req.user.companyId });

        await this.auditLogsService.log({
            action: AuditAction.CUSTOMER_CREATED,
            entity: 'Customer',
            entityId: (customer as any)._id?.toString(),
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { name: customer.name, phone: customer.phone }
        });

        return customer;
    }

    @Get()
    findAll(
        @Request() req,
        @Query('search') search?: string,
        @Query('tier') tier?: string,
        @Query('hasCredit') hasCredit?: string
    ) {
        return this.service.findAll(req.user.companyId, {
            search,
            tier,
            hasCredit: hasCredit === 'true'
        });
    }

    @Get('stats')
    getStats(@Request() req) {
        return this.service.getCompanyStats(req.user.companyId);
    }

    @Get('outstanding-credit')
    getOutstandingCredit(@Request() req) {
        return this.service.getCustomersWithCredit(req.user.companyId);
    }

    @Get('top')
    getTopCustomers(@Request() req, @Query('limit') limit?: string) {
        return this.service.getTopCustomers(req.user.companyId, limit ? parseInt(limit) : 10);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        const customer = await this.service.findById(id);
        if (!customer || customer.companyId !== req.user.companyId) {
            throw new NotFoundException('Customer not found');
        }
        return customer;
    }

    @Get(':id/insights')
    async getInsights(@Param('id') id: string) {
        return this.service.getCustomerInsights(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: any, @Request() req) {
        const customer = await this.service.update(id, dto);

        await this.auditLogsService.log({
            action: AuditAction.CUSTOMER_UPDATED,
            entity: 'Customer',
            entityId: id,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { updatedFields: Object.keys(dto) }
        });

        return customer;
    }

    @Patch(':id/credit')
    async updateCredit(
        @Param('id') id: string,
        @Body() body: { amount: number; operation: 'ADD' | 'DEDUCT' },
        @Request() req
    ) {
        const customer = await this.service.updateCreditBalance(id, body.amount, body.operation);

        await this.auditLogsService.log({
            action: AuditAction.CUSTOMER_CREDIT_UPDATED,
            entity: 'Customer',
            entityId: id,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { amount: body.amount, operation: body.operation, newBalance: customer.creditBalance }
        });

        return customer;
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req) {
        const customer = await this.service.findById(id);

        await this.service.delete(id);

        await this.auditLogsService.log({
            action: AuditAction.CUSTOMER_DELETED,
            entity: 'Customer',
            entityId: id,
            userId: req.user.sub,
            userName: req.user.email,
            companyId: req.user.companyId,
            details: { name: customer?.name }
        });

        return { message: 'Customer deleted successfully' };
    }
}

// =============== MODULE ===============

@Module({
    imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }])],
    controllers: [CustomersController],
    providers: [CustomersService],
    exports: [CustomersService]
})
export class CustomersModule { }

