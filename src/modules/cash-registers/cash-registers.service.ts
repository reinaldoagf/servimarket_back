// src/cash-registers/cash-registers.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { PaginatedCashRegisterResponseDto } from './dto/paginated-cash-register-response.dto';

const SELECT_FIELDS = {
  select: {
    id: true,
    description: true,
    branch: {
      select: {
        id: true,
        city: true,
        state: true,
        country: true,
      },
    },
  },
};

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
  async closeSales(id: string) {
    // 🔹 1️⃣ Verificar si la caja existe
    const cashRegister = await this.service.cashRegister.findUnique({
      where: { id },
    });

    if (!cashRegister) {
      throw new NotFoundException(`CashRegister with ID ${id} not found`);
    }

    // 🔹 2️⃣ Buscar ventas pendientes (sin fecha de cierre)
    const pendingSales = await this.service.businessBranchPurchase.findMany({
      where: {
        cashRegisterId: id,
        closingDate: null,
      },
      select: {
        id: true,
        clientName: true,
        clientDNI: true,
        totalAmount: true,
        amountCancelled: true,
        createdAt: true,
        status: true,
        cashRegister: {
          select: {
            id: true,
            description: true,
            branchId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 🔹 3️⃣ Si no hay ventas pendientes, avisamos
    if (!pendingSales.length) {
      return {
        message: 'No pending sales to close for this cash register',
        cashRegister: {
          id: cashRegister.id,
          description: cashRegister.description,
          branchId: cashRegister.branchId,
          createdAt: cashRegister.createdAt,
        },
        closedCount: 0,
      };
    }

    // 🔹 4️⃣ Actualizamos todas las ventas pendientes con la fecha actual
    const now = new Date();
    await this.service.businessBranchPurchase.updateMany({
      where: {
        cashRegisterId: id,
        closingDate: null,
      },
      data: { closingDate: now },
    });

    // 🔹 5️⃣ Calcular totales cerrados
    const totalClosedAmount = pendingSales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);

    // 🔹 6️⃣ Retornar resumen
    return {
      message: 'Sales successfully closed',
      closedCount: pendingSales.length,
      totalClosedAmount,
      closingDate: now,
      cashRegister: {
        id: cashRegister.id,
        description: cashRegister.description,
        branchId: cashRegister.branchId,
        createdAt: cashRegister.createdAt,
      },
      closedSales: pendingSales,
    };
  }
  // 🔹 Obtener ventas pendientes de cierre asociadas a una caja
  async salesToClose(id: string) {
    // Verificar si la caja existe
    const cashRegister = await this.service.cashRegister.findUnique({
      where: { id },
    });

    if (!cashRegister) {
      throw new NotFoundException(`CashRegister with ID ${id} not found`);
    }

    console.log({id})

    // Consultar ventas asociadas con closingDate == null
    const pendingSales = await this.service.businessBranchPurchase.findMany({
      where: {
        cashRegisterId: id,
        closingDate: null,
      },
      select: {
        id: true,
        clientName: true,
        clientDNI: true,
        totalAmount: true,
        amountCancelled: true,
        createdAt: true,
        status: true,
        cashRegister: SELECT_FIELDS,
        purchasesBillPaymentMethod: {
          select: {
            id: true,
            amountCancelled: true,
            businessBranchPurchaseId: true,
            businessBranchPurchase: true,
            billPaymentMethodId: true,
            billPaymentMethod: {
              select: {
                id: true,
                country: true,
                currencyId: true,
                currency: true,
                name: true,
              },
            },
            createdAt: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      cashRegister: {
        id: cashRegister.id,
        description: cashRegister.description,
        branchId: cashRegister.branchId,
        createdAt: cashRegister.createdAt,
      },
      totalSales: pendingSales.length,
      totalAmount: pendingSales.reduce((acc, s) => acc + s.totalAmount, 0),
      totalCancelled: pendingSales.reduce((acc, s) => acc + s.amountCancelled, 0),
      pendingSales,
    };
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
