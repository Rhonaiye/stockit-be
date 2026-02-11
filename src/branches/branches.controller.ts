import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) { }

    @Post()
    create(@Body() createBranchDto: any, @Request() req) {
        const companyId = req.user.companyId;
        return this.branchesService.create({ ...createBranchDto, companyId });
    }

    @Get()
    findAll(@Request() req) {
        const companyId = req.user.companyId;
        return this.branchesService.findAll(companyId);
    }
}
