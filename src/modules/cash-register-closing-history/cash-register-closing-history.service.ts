// src/cash-register-closing-history/cash-register-closing-history.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginatedCashRegisterClosingHistoryResponseDto } from './dto/paginated-cash-register-closing-history-response.dto';
const INCLUDE_FIELDS = {
  closedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
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
  closedSales: {
    select: {
      businessBranchPurchase: {
        select: {
          id: true,
          clientName: true,
          clientDNI: true,
          totalAmount: true,
          amountCancelled: true,
          createdAt: true,
          status: true,
            purchases: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: {
                      select: {
                        id: true,
                        name: true,
                        createdAt: true,
                      },
                    },
                  },
                },
              },
            },
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
      },
    },
  },
};
@Injectable()
export class CashRegisterClosingHistoryService {
  constructor(private service: PrismaService) {}
  async getByFilters(
    branchId?: string | null,
    page = 1,
    pageSize = 10,
    search = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedCashRegisterClosingHistoryResponseDto> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.CashRegisterClosingHistoryWhereInput = {};
    // 🔹 Filtro por branchId o businessId
    if (branchId?.length) {
      where.branchId = branchId;
    }
    if (search) {
      where.OR = [
        { closedBy: { name: { contains: search } } },
        { closedBy: { email: { contains: search } } },
        { closedBy: { username: { contains: search } } },
        { closedBy: { dni: { contains: search } } },
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
      this.service.cashRegisterClosingHistory.count({ where }),
      this.service.cashRegisterClosingHistory.findMany({
        where,
        include: INCLUDE_FIELDS,
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
}
