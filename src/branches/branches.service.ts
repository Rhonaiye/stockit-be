
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';

@Injectable()
export class BranchesService {
    constructor(@InjectModel(Branch.name) private branchModel: Model<BranchDocument>) { }

    async create(createBranchDto: any) {
        const branch = new this.branchModel(createBranchDto);
        return branch.save();
    }

    async findAll(companyId: string) {
        return this.branchModel.find({ companyId }).exec();
    }

    async countByCompany(companyId: string): Promise<number> {
        return this.branchModel.countDocuments({ companyId }).exec();
    }
}
