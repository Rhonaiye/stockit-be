
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inventory, InventoryDocument } from './schemas/inventory.schema';
import { StockTransaction, StockTransactionDocument, TransactionType } from './schemas/stock-transaction.schema';
import { StockReceipt, StockReceiptDocument, ReceiptStatus } from './schemas/stock-receipt.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';

@Injectable()
export class InventoryService {
    constructor(
        @InjectModel(Inventory.name) private inventoryModel: Model<InventoryDocument>,
        @InjectModel(StockTransaction.name) private transactionModel: Model<StockTransactionDocument>,
        @InjectModel(StockReceipt.name) private receiptModel: Model<StockReceiptDocument>,
        private auditLogsService: AuditLogsService
    ) { }

    // Generate unique receipt number
    private generateReceiptNumber(): string {
        const date = new Date();
        const prefix = 'SR';
        const timestamp = date.getFullYear().toString().slice(-2) +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    // Create a stock receipt (the smart way to add stock)
    async createStockReceipt(
        companyId: string,
        branchId: string,
        items: {
            productId: string;
            productName: string;
            quantity: number;
            costPerUnit: number;
            expiryDate?: Date;
            batchNumber?: string;
        }[],
        user: any,
        supplierId?: string,
        supplierInvoiceNumber?: string,
        notes?: string
    ) {
        if (!items || items.length === 0) {
            throw new BadRequestException('At least one item is required');
        }
        const userId = user.sub || user.userId || user.id;

        const receiptNumber = this.generateReceiptNumber();
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);

        // Assign batch numbers if not provided
        const itemsWithBatch = items.map(item => ({
            ...item,
            batchNumber: item.batchNumber || `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        }));

        const receipt = await this.receiptModel.create({
            receiptNumber,
            companyId,
            branchId,
            supplierId: supplierId === '' ? undefined : supplierId,
            supplierInvoiceNumber,
            items: itemsWithBatch,
            totalAmount,
            status: ReceiptStatus.PENDING,
            notes,
            receivedBy: userId,
            receivedDate: new Date()
        });

        await this.auditLogsService.log({
            action: AuditAction.STOCK_RECEIPT_CREATED,
            entity: 'StockReceipt',
            entityId: receipt._id.toString(),
            userId: userId,
            userName: user.email,
            companyId: companyId,
            branchId: branchId,
            details: { receiptNumber: receiptNumber, itemsCount: items.length, totalAmount: totalAmount }
        });

        return receipt;
    }

    // Verify and apply stock receipt (adds stock to inventory)
    async verifyStockReceipt(receiptId: string, companyId: string, user: any) {
        const receipt = await this.receiptModel.findOne({ _id: receiptId, companyId });
        const userId = user.sub || user.userId || user.id;

        if (!receipt) {
            throw new NotFoundException('Stock receipt not found');
        }

        if (receipt.status !== ReceiptStatus.PENDING) {
            throw new BadRequestException(`Receipt already ${receipt.status.toLowerCase()}`);
        }

        // Apply stock for each item
        for (const item of receipt.items) {
            await this.adjustStock(
                companyId,
                receipt.branchId,
                item.productId,
                item.quantity,
                TransactionType.STOCK_IN,
                `Stock Receipt: ${receipt.receiptNumber}`,
                user
            );
        }

        // Update receipt status
        receipt.status = ReceiptStatus.VERIFIED;
        receipt.verifiedBy = userId;
        receipt.verifiedDate = new Date();
        await receipt.save();

        await this.auditLogsService.log({
            action: AuditAction.STOCK_RECEIPT_VERIFIED,
            entity: 'StockReceipt',
            entityId: receipt._id.toString(),
            userId: userId,
            userName: user.email,
            companyId: companyId,
            branchId: receipt.branchId,
            details: { receiptNumber: receipt.receiptNumber }
        });

        return receipt;
    }

    // Reject a stock receipt
    async rejectStockReceipt(receiptId: string, companyId: string, user: any, reason: string) {
        const receipt = await this.receiptModel.findOne({ _id: receiptId, companyId });
        const userId = user.sub || user.userId || user.id;

        if (!receipt) {
            throw new NotFoundException('Stock receipt not found');
        }

        if (receipt.status !== ReceiptStatus.PENDING) {
            throw new BadRequestException(`Receipt already ${receipt.status.toLowerCase()}`);
        }

        receipt.status = ReceiptStatus.REJECTED;
        receipt.verifiedBy = userId;
        receipt.verifiedDate = new Date();
        receipt.notes = `${receipt.notes || ''}\n[REJECTED] ${reason}`;
        await receipt.save();

        await this.auditLogsService.log({
            action: AuditAction.STOCK_RECEIPT_REJECTED,
            entity: 'StockReceipt',
            entityId: receipt._id.toString(),
            userId: userId,
            userName: user.email,
            companyId: companyId,
            branchId: receipt.branchId,
            details: { receiptNumber: receipt.receiptNumber, reason: reason }
        });

        return receipt;
    }

    // Get all receipts
    async getStockReceipts(companyId: string, branchId?: string, status?: ReceiptStatus) {
        try {
            const query: any = { companyId };
            if (branchId) query.branchId = branchId;
            if (status) query.status = status;

            console.log(`Fetching receipts for company: ${companyId}, branch: ${branchId}, status: ${status}`);

            const receipts = await this.receiptModel.find(query)
                .sort({ createdAt: -1 })
                .populate('supplierId', 'name')
                .exec();

            console.log(`Found ${receipts.length} receipts`);
            return receipts;
        } catch (error) {
            console.error('Error in getStockReceipts:', error);
            throw error;
        }
    }

    // Get receipt by ID
    async getStockReceiptById(receiptId: string, companyId: string) {
        return this.receiptModel.findOne({ _id: receiptId, companyId })
            .populate('supplierId', 'name')
            .populate('receivedBy', 'name')
            .populate('verifiedBy', 'name')
            .exec();
    }

    // Get transaction history for a product
    async getProductTransactions(companyId: string, productId: string, limit = 50) {
        return this.transactionModel.find({ companyId, productId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('performedBy', 'name')
            .exec();
    }

    // Get all transactions for a branch
    async getBranchTransactions(companyId: string, branchId: string, limit = 100) {
        return this.transactionModel.find({ companyId, branchId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('performedBy', 'name')
            .populate('productId', 'name sku')
            .exec();
    }

    async adjustStock(
        companyId: string,
        branchId: string,
        productId: string,
        quantity: number,
        type: TransactionType,
        reason: string,
        user: any
    ) {
        const userId = user.sub || user.userId || user.id;
        console.log(`Adjusting stock: productId=${productId}, branchId=${branchId}, qty=${quantity}, type=${type}`);
        // 1. Log Transaction
        await this.transactionModel.create({
            companyId, branchId, productId, quantity, type, reason, performedBy: userId
        });

        // 2. Update Inventory
        const isIncrement = type === TransactionType.STOCK_IN ||
            type === TransactionType.RETURN ||
            (type === TransactionType.ADJUSTMENT && quantity > 0);

        const updateOp = isIncrement
            ? { $inc: { quantity: Math.abs(quantity) } }
            : { $inc: { quantity: -Math.abs(quantity) } };

        console.log(`Inventory UpdateOp: ${JSON.stringify(updateOp)}`);

        const result = await this.inventoryModel.findOneAndUpdate(
            { companyId, branchId, productId },
            { ...updateOp, $setOnInsert: { companyId } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`Inventory updated. New quantity: ${result?.quantity}`);

        // 3. Audit Log
        try {
            await this.auditLogsService.log({
                action: AuditAction.STOCK_ADJUSTED,
                entity: 'Product', // Or Inventory
                entityId: productId,
                userId: userId,
                userName: user.email || 'Unknown',
                companyId: companyId,
                branchId: branchId,
                details: {
                    quantity: quantity,
                    type: type,
                    newQuantity: result?.quantity,
                    reason: reason
                }
            });
        } catch (error) {
            console.error('Failed to log stock adjustment audit:', error);
        }

        return result;
    }

    async getStock(companyId: string, branchId: string, productId: string) {
        return this.inventoryModel.findOne({ companyId, branchId, productId });
    }

    async getLowStock(companyId: string, branchId: string) {
        return this.inventoryModel.find({
            companyId, branchId,
            $expr: { $lte: ["$quantity", "$lowStockThreshold"] }
        });
    }
}
