
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
    constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) { }

    async create(name: string, companyId: string, description?: string): Promise<Category> {
        try {
            const category = new this.categoryModel({ name, companyId, description });
            return await category.save();
        } catch (error) {
            if (error.code === 11000) {
                throw new ConflictException('Category already exists');
            }
            throw error;
        }
    }

    async findAll(companyId: string): Promise<Category[]> {
        return this.categoryModel.find({ companyId }).exec();
    }

    async remove(id: string, companyId: string): Promise<any> {
        return this.categoryModel.deleteOne({ _id: id, companyId }).exec();
    }

    async seedForNiche(niche: string, companyId: string) {
        const niches = {
            'Pharmacy': ['Medicines', 'Supplements', 'Personal Care', 'First Aid'],
            'Supermarket': ['Groceries', 'Dairy', 'Beverages', 'Household', 'Snacks'],
            'Boutique': ['Men Wear', 'Women Wear', 'Accessories', 'Shoes', 'Bags'],
            'General': ['Electronics', 'Stationery', 'Gifts']
        };

        const categories = niches[niche] || niches['General'];
        const seedPromises = categories.map(cat =>
            this.categoryModel.findOneAndUpdate(
                { companyId, name: cat },
                { companyId, name: cat },
                { upsert: true, new: true }
            )
        );
        return Promise.all(seedPromises);
    }
}
