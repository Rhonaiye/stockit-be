
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { StockReceipt, StockReceiptDocument } from '../inventory/schemas/stock-receipt.schema';

@Injectable()
export class SuppliersService {
    constructor(
        @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        @InjectModel(StockReceipt.name) private receiptModel: Model<StockReceiptDocument>,
    ) { }

    async create(dto: any, companyId: string) {
        return new this.supplierModel({ ...dto, companyId }).save();
    }

    async findAll(companyId: string) {
        return this.supplierModel.find({ companyId }).sort({ name: 1 }).exec();
    }

    async findOne(id: string, companyId: string) {
        const supplier = await this.supplierModel.findOne({ _id: id, companyId }).exec();
        if (!supplier) throw new NotFoundException('Supplier not found');
        return supplier;
    }

    async update(id: string, companyId: string, dto: any) {
        const supplier = await this.supplierModel.findOneAndUpdate(
            { _id: id, companyId },
            { $set: dto },
            { new: true }
        ).exec();
        if (!supplier) throw new NotFoundException('Supplier not found');
        return supplier;
    }

    async remove(id: string, companyId: string) {
        const result = await this.supplierModel.deleteOne({ _id: id, companyId }).exec();
        if (result.deletedCount === 0) throw new NotFoundException('Supplier not found');
        return result;
    }

    async getProfile(id: string, companyId: string) {
        const supplier = await this.findOne(id, companyId);

        // Linked products
        const products = await this.productModel.find({ supplierId: id, companyId }).exec();

        // Purchase history (Stock Receipts)
        const purchases = await this.receiptModel.find({ supplierId: id, companyId })
            .sort({ createdAt: -1 })
            .limit(10)
            .exec();

        // Basic stats
        const stats = await this.receiptModel.aggregate([
            { $match: { supplierId: new Types.ObjectId(id), companyId, status: 'VERIFIED' } },
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$totalAmount' },
                    totalOrders: { $count: {} }
                }
            }
        ]);

        return {
            supplier,
            products,
            purchases,
            stats: stats[0] || { totalSpent: 0, totalOrders: 0 }
        };
    }
}
