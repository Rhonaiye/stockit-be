
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { InventoryService } from '../inventory/inventory.service';
import { TransactionType } from '../inventory/schemas/stock-transaction.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/schemas/audit-log.schema';

@Injectable()
export class ProductsService {
    constructor(
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        private inventoryService: InventoryService,
        private auditLogsService: AuditLogsService
    ) { }

    async create(createProductDto: CreateProductDto, companyId: string, user: any): Promise<Product> {
        const userId = user.sub || user.userId || user.id;
        console.log(`Creating product: ${createProductDto.name} for company: ${companyId}`);

        // Sanitize: Clear empty strings for optional ObjectId fields
        const sanitizedData = { ...createProductDto };
        if (sanitizedData.supplierId === '') delete sanitizedData.supplierId;
        if (sanitizedData.branchId === '') delete sanitizedData.branchId;

        // 1. Create Product
        const product = new this.productModel({ ...sanitizedData, companyId });
        await product.save();
        console.log(`Product created with ID: ${product._id}`);

        try {
            await this.auditLogsService.log({
                action: AuditAction.PRODUCT_CREATED,
                entity: 'Product',
                entityId: product._id.toString(),
                userId: userId,
                userName: user.email || 'Unknown',
                companyId: companyId,
                details: { name: product.name, sku: product.sku }
            });
        } catch (error) {
            console.error('Failed to log audit event:', error);
        }

        // 2. Initial Stock (if provided)
        if (createProductDto.initialStock && createProductDto.initialStock > 0 && createProductDto.branchId) {
            console.log(`Adding initial stock: ${createProductDto.initialStock} for branch: ${createProductDto.branchId}`);
            await this.inventoryService.adjustStock(
                companyId,
                createProductDto.branchId,
                product._id.toString(),
                createProductDto.initialStock,
                TransactionType.STOCK_IN,
                'Initial Stock',
                user
            );
        }
        return product;
    }

    async findAll(companyId: string): Promise<any[]> {
        return this.productModel.aggregate([
            { $match: { companyId } },
            {
                $lookup: {
                    from: 'inventories',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'stockData'
                }
            },
            {
                $addFields: {
                    stock: {
                        $arrayToObject: {
                            $map: {
                                input: '$stockData',
                                as: 's',
                                in: { k: { $toString: '$$s.branchId' }, v: '$$s.quantity' }
                            }
                        }
                    }
                }
            },
            { $project: { stockData: 0 } }
        ]).exec();
    }
    async findOne(id: string, companyId: string): Promise<any> {
        const products = await this.productModel.aggregate([
            { $match: { _id: new (require('mongoose').Types.ObjectId)(id), companyId } },
            {
                $lookup: {
                    from: 'inventories',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'stockData'
                }
            },
            {
                $addFields: {
                    stock: {
                        $arrayToObject: {
                            $map: {
                                input: '$stockData',
                                as: 's',
                                in: { k: { $toString: '$$s.branchId' }, v: '$$s.quantity' }
                            }
                        }
                    }
                }
            },
            { $project: { stockData: 0 } }
        ]).exec();
        return products[0];
    }

    async update(id: string, companyId: string, updateDto: any, user: any): Promise<Product> {
        const userId = user.sub || user.userId || user.id;

        // Sanitize: Clear empty strings for optional ObjectId fields
        const sanitizedData = { ...updateDto };
        if (sanitizedData.supplierId === '') sanitizedData.supplierId = null;
        if (sanitizedData.branchId === '') sanitizedData.branchId = null;

        const updatedProduct = await this.productModel.findOneAndUpdate(
            { _id: id, companyId },
            { $set: sanitizedData },
            { new: true }
        ).exec();

        if (!updatedProduct) {
            throw new NotFoundException(`Product #${id} not found`);
        }

        await this.auditLogsService.log({
            action: AuditAction.PRODUCT_UPDATED,
            entity: 'Product',
            entityId: id,
            userId: userId,
            userName: user.email,
            companyId: companyId,
            details: { updatedFields: Object.keys(updateDto) }
        });

        return updatedProduct;
    }

    async remove(id: string, companyId: string, user: any): Promise<any> {
        const userId = user.sub || user.userId || user.id;
        const result = await this.productModel.deleteOne({ _id: id, companyId }).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException(`Product #${id} not found`);
        }

        await this.auditLogsService.log({
            action: AuditAction.PRODUCT_DELETED,
            entity: 'Product',
            entityId: id,
            userId: userId,
            userName: user.email,
            companyId: companyId,
            details: { productId: id }
        });

        return result;
    }
}
