
import { Controller, Get, Post, Body, Request, UseGuards, Delete, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    create(@Body() body: { name: string, description?: string }, @Request() req) {
        return this.categoriesService.create(body.name, req.user.companyId, body.description);
    }

    @Get()
    findAll(@Request() req) {
        return this.categoriesService.findAll(req.user.companyId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.categoriesService.remove(id, req.user.companyId);
    }

    @Post('seed')
    seed(@Body() body: { niche: string }, @Request() req) {
        return this.categoriesService.seedForNiche(body.niche, req.user.companyId);
    }
}
