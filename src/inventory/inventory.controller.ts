import { Controller, Post, Body, Get, Query, UseGuards, Request, Param, Patch } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptStatus } from './schemas/stock-receipt.schema';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    // Stock Adjustment (for manual adjustments only - requires manager role ideally)
    // Stock Adjustment (for manual adjustments only - requires manager role ideally)
    @Post('adjust')
    adjust(@Body() body, @Request() req) {
        const companyId = req.user.companyId;
        return this.inventoryService.adjustStock(
            companyId,
            body.branchId,
            body.productId,
            body.quantity,
            body.type,
            body.reason,
            req.user
        );
    }

    // ============ STOCK RECEIPTS (The smart way to add stock) ============

    // Create a new stock receipt
    @Post('receipts')
    createReceipt(@Body() body, @Request() req) {
        const companyId = req.user.companyId;
        return this.inventoryService.createStockReceipt(
            companyId,
            body.branchId,
            body.items,
            req.user,
            body.supplierId,
            body.supplierInvoiceNumber,
            body.notes
        );
    }

    // Get all receipts
    @Get('receipts')
    getReceipts(@Request() req, @Query('branchId') branchId?: string, @Query('status') status?: ReceiptStatus) {
        return this.inventoryService.getStockReceipts(req.user.companyId, branchId, status);
    }

    // Get single receipt
    @Get('receipts/:id')
    getReceiptById(@Param('id') id: string, @Request() req) {
        return this.inventoryService.getStockReceiptById(id, req.user.companyId);
    }

    // Verify receipt (applies stock)
    @Patch('receipts/:id/verify')
    verifyReceipt(@Param('id') id: string, @Request() req) {
        return this.inventoryService.verifyStockReceipt(id, req.user.companyId, req.user);
    }

    // Reject receipt
    @Patch('receipts/:id/reject')
    rejectReceipt(@Param('id') id: string, @Body() body, @Request() req) {
        return this.inventoryService.rejectStockReceipt(id, req.user.companyId, req.user, body.reason);
    }

    // ============ TRANSACTION HISTORY ============

    // Get transactions for a product
    @Get('transactions/product/:productId')
    getProductTransactions(@Param('productId') productId: string, @Request() req, @Query('limit') limit?: number) {
        return this.inventoryService.getProductTransactions(req.user.companyId, productId, limit);
    }

    // Get transactions for a branch
    @Get('transactions/branch/:branchId')
    getBranchTransactions(@Param('branchId') branchId: string, @Request() req, @Query('limit') limit?: number) {
        return this.inventoryService.getBranchTransactions(req.user.companyId, branchId, limit);
    }

    // ============ STOCK QUERIES ============

    @Get('low-stock')
    getLowStock(@Request() req, @Query('branchId') branchId: string) {
        return this.inventoryService.getLowStock(req.user.companyId, branchId);
    }
}
