import { Controller, Get, Post, Body, Request, UseGuards, Param, Patch, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    create(@Body() createProductDto: CreateProductDto, @Request() req) {
        const companyId = req.user.companyId;
        return this.productsService.create(createProductDto, companyId, req.user);
    }

    @Get()
    findAll(@Request() req) {
        const companyId = req.user.companyId;
        return this.productsService.findAll(companyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.productsService.findOne(id, req.user.companyId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
        return this.productsService.update(id, req.user.companyId, updateDto, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.productsService.remove(id, req.user.companyId, req.user);
    }
}
