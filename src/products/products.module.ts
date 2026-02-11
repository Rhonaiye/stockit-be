
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './schemas/product.schema';
import { InventoryModule } from '../inventory/inventory.module'; // Depend on Inventory for initial stock

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
        forwardRef(() => InventoryModule)
    ],
    controllers: [ProductsController],
    providers: [ProductsService],
    exports: [ProductsService, MongooseModule]
})
export class ProductsModule { }
