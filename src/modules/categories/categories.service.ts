// src/modules/categories/categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginatedCategoryResponseDto } from './dto/paginated-category-response.dto';

const SELECT_FIELDS = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
};

@Injectable()
export class CategoriesService {
  constructor(private service: PrismaService) {}

  async getByFilters(
    page = 1,
    pageSize = 10,
    search = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedCategoryResponseDto> {
    const skip = (page - 1) * pageSize;

    // Construimos los filtros dinámicamente
    const where: Prisma.ProductCategoryWhereInput = {};

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
      this.service.productCategory.count({ where }),
      this.service.productCategory.findMany({
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

  async addCategory(dto: CreateCategoryDto) {
    // Crear el colaborador
    return this.service.productCategory.create({
      data: {
        name: dto.name,
        status: dto.status,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.service.productCategory.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.service.productCategory.update({
      where: { id },
      data: {
        name: dto.name ?? category.name,
        status: dto.status ?? category.status,
      },
    });
  }
  async deleteCategory(id: string) {
    // Verificar si existe antes de eliminar
    const category = await this.service.productCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.service.productCategory.delete({
      where: { id },
    });
  }
}
