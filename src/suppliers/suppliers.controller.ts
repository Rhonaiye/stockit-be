
import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.suppliersService.create(dto, req.user.companyId);
    }

    @Get()
    findAll(@Request() req) {
        return this.suppliersService.findAll(req.user.companyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.suppliersService.findOne(id, req.user.companyId);
    }

    @Get(':id/profile')
    getProfile(@Param('id') id: string, @Request() req) {
        return this.suppliersService.getProfile(id, req.user.companyId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any, @Request() req) {
        return this.suppliersService.update(id, req.user.companyId, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.suppliersService.remove(id, req.user.companyId);
    }
}
