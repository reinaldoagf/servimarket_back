import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductStockDto } from './dto/create-product-stock.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { PaginatedProductStockResponseDto } from './dto/paginated-product-stock-response.dto';
import { normalize } from 'src/common/utils/normalize.util';

const SELECT_FIELDS = {
  id: true,
  availables: true,
  salePrice: true,
  purchasePrice: true,
  profitPercentage: true,
  returnOnInvestment: true,
  productId: true,
  product: {
    select: {
      id: true,
      name: true,
      status: true,
      priceCalculation: true,
      measurement: true,
      flavor: true,
      smell: true,
      exemptFromVAT: true,
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
      category: {
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
  constructor(private service: PrismaService) {}

  // ✅ Obtener total por filtros
  async getTotalByFilters(branchId: string): Promise<number> {
    // Construimos los filtros dinámicamente
    const where: Prisma.ProductStockWhereInput = {};

    if (branchId?.length) {
      const existing = await this.service.businessBranch.findUnique({ where: { id: branchId } });
      if (!existing) throw new NotFoundException(`BusinessBranch with ID ${branchId} not found`);
      where.branchId = branchId;
    }
    return await this.service.productStock.count({ where });
  }

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
      const existing = await this.service.businessBranch.findUnique({ where: { id: branchId } });
      if (!existing) throw new NotFoundException(`BusinessBranch with ID ${branchId} not found`);
      where.branchId = branchId;
    }

    if (search) {
      const normalizedSearch = normalize(search);
      const searchValue = normalizedSearch ?? search;
      where.OR = [
        { product: { barcode: { contains: searchValue } } },
        { product: { name: { contains: searchValue } } },
        { product: { flavor: { contains: searchValue } } },
        { product: { smell: { contains: searchValue } } },
        { product: { brand: { name: { contains: searchValue } } } },
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

    const [total, data] = await Promise.all([
      this.service.productStock.count({ where }),
      this.service.productStock.findMany({
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

  // ✅ Crear nuevo registro
  async create(dto: CreateProductStockDto) {
    const { productId, branchId } = dto;
    // Verificar existencia previa
    const existing = await this.service.productStock.findFirst({
      where: {
        productId,
        branchId,
      },
    });

    if (existing) {
      throw new BadRequestException(`A ProductStock record with this combination already exists.`);
    }

    try {
      return await this.service.productStock.create({
        data: {
          availables: dto.availables,
          salePrice: dto.salePrice ?? 0,
          purchasePrice: dto.purchasePrice ?? 0,
          profitPercentage: dto.profitPercentage,
          returnOnInvestment: dto.returnOnInvestment,
          productId: dto.productId,
          branchId: dto.branchId,
        },
        include: {
          product: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(`Error creating product stock: ${error.message}`);
    }
  }

  // ✅ Actualizar registro
  async update(id: string, dto: UpdateProductStockDto) {
    const existing = await this.service.productStock.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`ProductStock with ID ${id} not found`);
    try {
      return await this.service.productStock.update({
        where: { id },
        data: {
          ...dto,
        },
        include: {
          product: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(`Error updating product stock: ${error.message}`);
    }
  }

  // ✅ Eliminar registro
  async remove(id: string) {
    const existing = await this.service.productStock.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`ProductStock with ID ${id} not found`);

    await this.service.productStock.delete({ where: { id } });
    return { message: `ProductStock with ID ${id} deleted successfully` };
  }

  // ✅ Eliminar registros
  async deleteProductStockByBranch(branchId: string, productId: string) {
    const branch = await this.service.businessBranch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`BusinessBranch with ID ${branchId} not found`);

    const product = await this.service.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product with ID ${productId} not found`);

    const existing = await this.service.productStock.findFirst({
      where: { branchId, productId },
    });

    if (!existing)
      throw new NotFoundException(
        `ProductStock with branchId ${branchId} and productId ${productId} not found`,
      );

    if (existing?.id) {
      await this.service.purchase.updateMany({
        where: { productStockId: existing.id },
        data: {
          productStockRef: existing.id,
        },
      });
    }

    const deleted = await this.service.productStock.deleteMany({
      where: { branchId, productId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(
        `No ProductStock records found for product ${productId} in branch ${branchId}`,
      );
    }

    return { message: `Deleted ${deleted.count} ProductStock record(s)` };
  }
}
