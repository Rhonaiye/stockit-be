import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to StockIt API - Your Inventory Management Solution';
  }
}
