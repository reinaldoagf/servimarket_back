// src/modules/brands/brands.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { PaginatedBrandResponseDto } from './dto/paginated-brand-response.dto';

const SELECT_FIELDS = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
};

@Injectable()
export class BrandsService {
  constructor(private service: PrismaService) {}

  async getByFilters(
    page = 1,
    pageSize = 10,
    search = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedBrandResponseDto> {
    const skip = (page - 1) * pageSize;

    // Construimos los filtros dinámicamente
    const where: Prisma.ProductBrandWhereInput = {};

    if (search) {
      where.OR = [{ name: { contains: search } }];
    }

    if (startDate && endDate) {
      where[dateKey] = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where[dateKey] = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where[dateKey] = {
        lte: new Date(endDate),
      };
    }

    const [total, data] = await Promise.all([
      this.service.productBrand.count({ where }),
      this.service.productBrand.findMany({
        where,
        select: SELECT_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async addBrand(dto: CreateBrandDto) {
    // Crear el colaborador
    return this.service.productBrand.create({
      data: {
        name: dto.name,
        status: dto.status,
      },
    });
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    const brand = await this.service.productBrand.findUnique({ where: { id } });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return this.service.productBrand.update({
      where: { id },
      data: {
        name: dto.name ?? brand.name,
        status: dto.status ?? brand.status,
      },
    });
  }
  async deleteBrand(id: string) {
    // Verificar si existe antes de eliminar
    const brand = await this.service.productBrand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return this.service.productBrand.delete({
      where: { id },
    });
  }
}
