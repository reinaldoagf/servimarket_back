// src/modules/products/products.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginatedProductResponseDto } from './dto/paginated-product-response.dto';

const SELECT_FIELDS = {
  id: true,
  barcode: true,
  name: true,
  flavor: true,
  smell: true,
  exemptFromVAT: true,
  status: true,
  createdAt: true,
  brandId: true,
  categoryId: true,
  businessId: true,
  priceCalculation: true,
  measurement: true,
  unitMeasurement: true,
  brand: { select: { id: true, name: true, createdAt: true } },
  category: { select: { id: true, name: true, createdAt: true } },
  business: { select: { id: true, name: true, createdAt: true } },
  tags: {
    select: {
      id: true,
      tag: true,
      createdAt: true,
    },
  },
};

@Injectable()
export class ProductsService {
  constructor(private service: PrismaService) {}

  async getByFilters(
    businessId?: string | null,
    page = 1,
    pageSize = 10,
    search = '',
    status = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedProductResponseDto> {
    const skip = (page - 1) * pageSize;

    // Construimos los filtros dinámicamente
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { barcode: { contains: search } },
        { name: { contains: search } },
        { flavor: { contains: search } },
        { smell: { contains: search } },
        { brand: { name: { contains: search } } },
        { category: { name: { contains: search } } },
      ];
    }
    // 🔹 Filtro por businessId si existe
    if (businessId) {
      where.OR = [{ businessId: businessId }, { status: 'activo' }];
    } else {
      if (status && status !== 'Todos') {
        where.status = status as any; // casteamos porque viene como string
      }
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
      this.service.product.count({ where }),
      this.service.product.findMany({
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

  // ✅ Buscar uno por ID
  async findOne(id: string) {
    const product = await this.service.product.findUnique({
      where: { id },
      select: SELECT_FIELDS,
    });

    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  async addProduct(dto: CreateProductDto) {
    try {
      if (!dto.brandId && dto.brandName) {
        let brand = await this.service.productBrand.findUnique({ where: { name: dto.brandName } });
        if (!brand) {
          brand = await this.service.productBrand.create({
            data: { name: dto.brandName, status: 'revisar' },
          });
        }
        dto.brandId = brand.id;
      }
      if (!dto.categoryId && dto.categoryName) {
        let category = await this.service.productCategory.findUnique({
          where: { name: dto.categoryName },
        });
        if (!category) {
          category = await this.service.productCategory.create({
            data: { name: dto.categoryName, status: 'revisar' },
          });
        }
        dto.categoryId = category.id;
      }

      // Crear producto junto con presentaciones si vienen
      const product = await this.service.product.create({
        data: {
          barcode: dto.barcode ?? null,
          name: dto.name,
          flavor: dto.flavor ?? null,
          smell: dto.smell ?? null,
          exemptFromVAT: dto.exemptFromVAT ?? true,
          measurement: dto.measurement ?? null,
          priceCalculation: dto.priceCalculation ?? 'unidad',
          unitMeasurement: dto.unitMeasurement,
          brandId: dto.brandId ?? null,
          categoryId: dto.categoryId ?? null,
          businessId: dto.businessId ?? null,
          status: dto.businessId ? 'revisar' : (dto.status ?? null),
          tags: dto.tags?.length
            ? { create: dto.tags.map((p) => ({ tag: p.tag ?? null })) }
            : undefined,
        },
        select: SELECT_FIELDS,
      });

      return product;
    } catch (err: any) {
      throw new BadRequestException(`Error creating product: ${err.message}`);
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    try {
      if (!dto.brandId && dto.brandName) {
        let brand = await this.service.productBrand.findUnique({ where: { name: dto.brandName } });
        if (!brand) {
          brand = await this.service.productBrand.create({
            data: { name: dto.brandName, status: 'revisar' },
          });
        }
        dto.brandId = brand.id;
      }
      if (!dto.categoryId && dto.categoryName) {
        let category = await this.service.productCategory.findUnique({
          where: { name: dto.categoryName },
        });
        if (!category) {
          category = await this.service.productCategory.create({
            data: { name: dto.categoryName, status: 'revisar' },
          });
        }
        dto.categoryId = category.id;
      }
      const product = await this.service.product.update({
        where: { id },
        data: {
          barcode: dto.barcode,
          name: dto.name,
          flavor: dto.flavor,
          smell: dto.smell,
          exemptFromVAT: dto.exemptFromVAT ?? true,
          measurement: dto.measurement ?? null,
          priceCalculation: dto.priceCalculation ?? 'unidad',
          unitMeasurement: dto.unitMeasurement,
          brandId: dto.brandId ?? null,
          categoryId: dto.categoryId ?? null,
          status: dto.status ?? 'activo',
          tags: {
            // Borra las anteriores y crea las nuevas
            deleteMany: {},
            create:
              dto.tags?.map((p) => ({
                tag: p.tag ?? null,
              })) || [],
          },
        },
        select: SELECT_FIELDS,
      });

      return product;
    } catch (err: any) {
      throw new BadRequestException(`Error updating product: ${err.message}`);
    }
  }

  async deleteProduct(id: string) {
    // Verificar si existe antes de eliminar
    const product = await this.service.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 🔹 Buscar todos los branches asociados al negocio
    const tags = await this.service.productTag.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const tagsIds = tags.map((b) => b.id);
    // 🔹 Si existen dependencias (ejemplo: pendings ligados a branchId), borrarlas primero
    if (tagsIds.length > 0) {
      await this.service.productTag.deleteMany({
        where: { productId: { in: tagsIds } },
      });
    }

    return this.service.product.delete({
      where: { id },
    });
  }
}
