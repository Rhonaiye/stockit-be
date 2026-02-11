
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { InventoryService } from '../inventory/inventory.service';
import { TransactionType } from '../inventory/schemas/stock-transaction.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';

import { CustomersService } from '../customers/customers.module';

@Injectable()
export class SalesService {
    constructor(
        @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
        private inventoryService: InventoryService,
        private auditLogsService: AuditLogsService,
        private customersService: CustomersService,
    ) { }

    async create(createSaleDto: any, user: any) {
        const userId = user.sub || user.userId || user.id;
        // 1. Create Sale Record
        const sale = new this.saleModel({ ...createSaleDto, soldBy: userId });
        await sale.save();

        // 2. Track Customer Stats
        if (createSaleDto.customerId) {
            await this.customersService.recordPurchase(createSaleDto.customerId, createSaleDto.totalAmount);

            // If it's a credit sale, add to customer's debt
            if (createSaleDto.paymentMethod === 'CREDIT') {
                await this.customersService.updateCreditBalance(createSaleDto.customerId, createSaleDto.totalAmount, 'ADD');
            }
        }

        await this.auditLogsService.log({
            action: AuditAction.SALE_CREATED,
            entity: 'Sale',
            entityId: sale._id.toString(),
            userId: userId,
            userName: user.email,
            companyId: createSaleDto.companyId,
            branchId: createSaleDto.branchId,
            details: {
                amount: sale.totalAmount,
                items: sale.items.length,
                paymentMethod: sale.paymentMethod
            }
        });

        // 2. Deduct Stock for each item
        for (const item of createSaleDto.items) {
            await this.inventoryService.adjustStock(
                createSaleDto.companyId,
                createSaleDto.branchId,
                item.productId,
                item.quantity,
                TransactionType.SALE,
                `Sale #${sale.id}${item.variantName ? ` (${item.variantName})` : ''}`,
                user
            );
        }

        return sale;
    }

    async findAll(companyId: string) {
        return this.saleModel.find({ companyId })
            .populate('soldBy', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }
}
