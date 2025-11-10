// src/suppliers/suppliers.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PaginatedSupplierResponseDto } from './dto/paginated-supplier-response.dto';

@Injectable()
export class SuppliersService {
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
  ): Promise<PaginatedSupplierResponseDto> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.BusinessBranchSupplierWhereInput = {};

    // 🔹 Filtro por businessId si existe
    if (businessId) {
      const branchFilter: Prisma.BusinessBranchWhereInput = {
        businessId: { equals: businessId },
      };
      where.branch = branchFilter;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { username: { contains: search } } },
        { user: { dni: { contains: search } } },
        { branch: { country: { contains: search } } },
        { branch: { state: { contains: search } } },
        { branch: { city: { contains: search } } },
        { branch: { address: { contains: search } } },
      ];
    }

    if (status) {
      where.user = {
        ...where.user,
        status: status as any,
      };
    }

    if (startDate && endDate) {
      where[dateKey] = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where[dateKey] = { gte: new Date(startDate) };
    } else if (endDate) {
      where[dateKey] = { lte: new Date(endDate) };
    }

    const [total, suppliers] = await Promise.all([
      this.service.businessBranchSupplier.count({ where }),
      this.service.businessBranchSupplier.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              avatar: true,
              createdAt: true,
              roleId: true,
              country: true,
              state: true,
              city: true,
              businessId: true,
            },
          },
          branch: {
            select: {
              id: true,
              country: true,
              state: true,
              city: true,
              address: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    // 🔹 Mapear resultados al DTO esperado
    const data = suppliers.map((c) => ({
      id: c.id,
      user: c.user,
      branch: c.branch,
      createdAt: c.createdAt,
    }));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async addSupplier(dto: CreateSupplierDto) {
    const branch = await this.service.businessBranch.findUnique({
      where: { id: dto.branchId },
      include: { business: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Validar que el colaborador no sea el owner
    if (branch.business?.ownerId === dto.userId) {
      throw new BadRequestException('Owner cannot be added as user');
    }

    // Validar si ya existe
    const existing = await this.service.businessBranchSupplier.findFirst({
      where: { branchId: dto.branchId, userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException('Supplier is already a user of this branch');
    }

    // Crear el colaborador
    return this.service.businessBranchSupplier.create({
      data: {
        branchId: dto.branchId,
        userId: dto.userId,
      },
    });
  }
  async deleteSupplier(id: string) {
    // Verificar si existe antes de eliminar
    const supplier = await this.service.businessBranchSupplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.service.businessBranchSupplier.delete({
      where: { id },
    });
  }
}
