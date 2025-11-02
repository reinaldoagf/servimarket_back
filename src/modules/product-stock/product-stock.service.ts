import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductStockDto } from './dto/create-product-stock.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { PaginatedProductStockResponseDto } from './dto/paginated-product-stock-response.dto';

const SELECT_FIELDS = {
  id: true,
  units: true,
  priceByUnit: true,
  availableQuantity: true,
  priceByMeasurement: true,
  quantityPerMeasure: true,
  totalSellingPrice: true,
  purchasePricePerUnit: true,
  profitPercentage: true,
  returnOnInvestment: true,
  productPresentationId: true,
  productPresentation: true,
  productId: true,
  product: {
    select: {
      id: true,
      name: true,
      status: true,
      priceCalculation: true,
      unitMeasurement: true,
      createdAt: true,
      brandId: true,
      brand: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
    },
  },
  branchId: true,
  branch: true,
  createdAt: true,
};

@Injectable()
export class ProductStockService {
  constructor(private prisma: PrismaService) {}

  // ✅ Obtener por filtros
  async getByFilters(
    branchId: string,
    page = 1,
    pageSize = 10,
    search = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedProductStockResponseDto> {
    const skip = (page - 1) * pageSize;

    // Construimos los filtros dinámicamente
    const where: Prisma.ProductStockWhereInput = {};

    if (branchId?.length) {
      const existing = await this.prisma.businessBranch.findUnique({ where: { id: branchId } });
      if (!existing) throw new NotFoundException(`BusinessBranch with ID ${branchId} not found`);
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search } } },
        { productPresentation: { flavor: { contains: search } } },
      ];
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

    const [total, distinctProducts, data] = await Promise.all([
      this.prisma.productStock.count({ where }),
      this.prisma.productStock.groupBy({
        by: ['productId'],
        where,
      }),
      this.prisma.productStock.findMany({
        where,
        select: SELECT_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    const totalByProducts = distinctProducts.length;

    return {
      data,
      total,
      totalByProducts,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ✅ Crear nuevo registro
  async create(dto: CreateProductStockDto) {
    const { productId, branchId, productPresentationId } = dto;
    // Verificar existencia previa
    const existing = await this.prisma.productStock.findFirst({
      where: {
        productId,
        branchId,
        productPresentationId: productPresentationId ?? null, // trata null como null literal
      },
    });

    if (existing) {
      throw new BadRequestException(
        `A ProductStock record with this combination already exists.`,
      );
    }

    try {
      return await this.prisma.productStock.create({
        data: {
          units: dto.units,
          priceByUnit: dto.priceByUnit ?? 0,
          availableQuantity: dto.availableQuantity ?? 0,
          priceByMeasurement: dto.priceByMeasurement ?? 0,
          quantityPerMeasure: dto.quantityPerMeasure ?? 0,
          totalSellingPrice: dto.totalSellingPrice,
          purchasePricePerUnit: dto.purchasePricePerUnit,
          profitPercentage: dto.profitPercentage,
          returnOnInvestment: dto.returnOnInvestment,
          productPresentationId: dto.productPresentationId ?? null,
          productId: dto.productId,
          branchId: dto.branchId,
        },
        include: {
          productPresentation: true,
          product: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(`Error creating product stock: ${error.message}`);
    }
  }

  // ✅ Actualizar registro
  async update(id: string, dto: UpdateProductStockDto) {
    const existing = await this.prisma.productStock.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`ProductStock with ID ${id} not found`);
    try {
      return await this.prisma.productStock.update({
        where: { id },
        data: {
          ...dto,
        },
        include: {
          productPresentation: true,
          product: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(`Error updating product stock: ${error.message}`);
    }
  }

  // ✅ Eliminar registro
  async remove(id: string) {
    const existing = await this.prisma.productStock.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`ProductStock with ID ${id} not found`);

    await this.prisma.productStock.delete({ where: { id } });
    return { message: `ProductStock with ID ${id} deleted successfully` };
  }

  // ✅ Eliminar registros
  async deleteProductStockByBranch(branchId: string, productId: string) {
    const branch = await this.prisma.businessBranch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`BusinessBranch with ID ${branchId} not found`);

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product with ID ${productId} not found`);

    const deleted = await this.prisma.productStock.deleteMany({
      where: { branchId, productId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`No ProductStock records found for product ${productId} in branch ${branchId}`);
    }

    return { message: `Deleted ${deleted.count} ProductStock record(s)` };
  }
}
