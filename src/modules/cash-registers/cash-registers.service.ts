// src/cash-registers/cash-registers.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { PaginatedCashRegisterResponseDto } from './dto/paginated-cash-register-response.dto';

@Injectable()
export class CashRegistersService {
  constructor(private service: PrismaService) {}
  async getByFilters(
    businessId?: string | null,
    branchId?: string | null,
    page = 1,
    pageSize = 10,
    search = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedCashRegisterResponseDto> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.CashRegisterWhereInput = {};

    // 🔹 Filtro por branchId o businessId
    if (branchId?.length) {
      where.branchId = branchId;
    } else if (businessId) {
      where.branch = { businessId };
    }

    // 🔹 Búsqueda por texto (nombre, email, dirección, etc.)
    if (search) {
      where.OR = [
        { collaborator: { user: { name: { contains: search } } } },
        { collaborator: { user: { email: { contains: search } } } },
        { collaborator: { user: { username: { contains: search } } } },
        { collaborator: { user: { dni: { contains: search } } } },
        { branch: { country: { contains: search } } },
        { branch: { state: { contains: search } } },
        { branch: { city: { contains: search } } },
        { branch: { address: { contains: search } } },
      ];
    }

    // 🔹 Filtro por rango de fechas
    if (startDate && endDate) {
      where[dateKey] = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (startDate) {
      where[dateKey] = { gte: new Date(startDate) };
    } else if (endDate) {
      where[dateKey] = { lte: new Date(endDate) };
    }

    // 🔹 Consulta total y resultados paginados
    const [total, data] = await Promise.all([
      this.service.cashRegister.count({ where }),
      this.service.cashRegister.findMany({
        where,
        include: {
          collaborator: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  createdAt: true,
                },
              },
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

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async addCashRegister(dto: CreateCashRegisterDto) {
    const branch = await this.service.businessBranch.findUnique({
      where: { id: dto.branchId },
      include: { business: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    // Crear el colaborador
    return this.service.cashRegister.create({
      data: dto,
    });
  }

  async deleteCashRegister(id: string) {
    // Verificar si existe antes de eliminar
    const cashRegister = await this.service.cashRegister.findUnique({
      where: { id },
    });

    if (!cashRegister) {
      throw new NotFoundException(`CashRegister with ID ${id} not found`);
    }

    return this.service.cashRegister.delete({
      where: { id },
    });
  }
}
