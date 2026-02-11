
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class VariantDto {
    @IsString()
    name: string;
    @IsNumber()
    price: number;
    @IsString()
    @IsOptional()
    sku?: string;
}

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    sku: string; // If empty, backend logic should generate

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsString()
    category: string;

    @IsNumber()
    costPrice: number;

    @IsNumber()
    sellingPrice: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VariantDto)
    variants: VariantDto[];

    @IsNumber()
    @IsOptional()
    initialStock?: number;

    @IsString()
    @IsOptional()
    branchId?: string; // For initial stock

    @IsString()
    @IsOptional()
    supplierId?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsNumber()
    minStockLevel: number;
}
