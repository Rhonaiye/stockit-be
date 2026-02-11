
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { CustomersModule } from '../customers/customers.module'; // To track customer purchases
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { InventoryModule } from '../inventory/inventory.module'; // To deduct stock

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema }]),
        InventoryModule,
        CustomersModule
    ],
    controllers: [SalesController],
    providers: [SalesService],
})
export class SalesModule { }
