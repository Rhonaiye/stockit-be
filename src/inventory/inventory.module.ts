
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Inventory, InventorySchema } from './schemas/inventory.schema';
import { StockTransaction, StockTransactionSchema } from './schemas/stock-transaction.schema';
import { StockReceipt, StockReceiptSchema } from './schemas/stock-receipt.schema';

import { SuppliersModule } from '../suppliers/suppliers.module';
import { BranchesModule } from '../branches/branches.module';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Inventory.name, schema: InventorySchema },
            { name: StockTransaction.name, schema: StockTransactionSchema },
            { name: StockReceipt.name, schema: StockReceiptSchema }
        ]),
        SuppliersModule,
        BranchesModule,
        forwardRef(() => ProductsModule),
        UsersModule
    ],
    controllers: [InventoryController],
    providers: [InventoryService],
    exports: [InventoryService],
})
export class InventoryModule { }

