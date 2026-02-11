
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier, SupplierSchema } from './schemas/supplier.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { StockReceipt, StockReceiptSchema } from '../inventory/schemas/stock-receipt.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Supplier.name, schema: SupplierSchema },
            { name: Product.name, schema: ProductSchema },
            { name: StockReceipt.name, schema: StockReceiptSchema }
        ])
    ],
    controllers: [SuppliersController],
    providers: [SuppliersService],
    exports: [SuppliersService, MongooseModule]
})
export class SuppliersModule { }
