import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Post()
    create(@Body() createSaleDto: any, @Request() req) {
        return this.salesService.create(createSaleDto, req.user);
    }

    @Get()
    findAll(@Request() req) {
        const companyId = req.user.companyId;
        return this.salesService.findAll(companyId);
    }
}
