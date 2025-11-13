import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessBranchPurchaseDto } from './dto/create-business-branch-purchase.dto';
import { PaginatedBusinessBranchPurchaseResponseDto } from './dto/paginated-business-branch-purchase-response.dto';
import { Prisma } from '@prisma/client';
import { ClientsService } from '../clients/clients.service';
import { UpdateBusinessBranchPurchaseDto } from './dto/update-business-branch-purchase.dto';

const INCLUDE_FIELDS = {
  cashRegister: {
    include: {
      business: { select: { id: true, name: true } },
      branch: { select: { id: true, city: true, address: true } },
    },
  },
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
};

const SELECT_FIELDS = {
  id: true,
  clientName: true,
  clientDNI: true,
  userId: true,
  cashRegisterId: true,
  amountCancelled: true,
  totalAmount: true,
  status: true,
  createdAt: true,
  cashRegister: {
    select: {
      id: true,
      description: true,
      collaborator: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true, dni: true } },
          branch: {
            select: {
              id: true,
              address: true,
              business: { select: { id: true, name: true, rif: true, logo: true } },
            },
          },
        },
      },
    },
  },
  user: { select: { id: true, name: true, email: true, avatar: true } },
  purchases: {
    select: {
      id: true,
      productId: true,
      unitsOrMeasures: true,
      price: true,
      createdAt: true,
      product: { select: { id: true, name: true } },
    },
  },
};
@Injectable()
export class BusinessBranchPurchaseService {
  constructor(
    private readonly service: PrismaService,
    private clientsService: ClientsService,
  ) {}

  async create(dto: CreateBusinessBranchPurchaseDto) {
    // 1️⃣ Validar ID de caja registradora
    if (!dto.cashRegisterId?.length) {
      throw new BadRequestException('CashRegisterId is required.');
    }

    // 2️⃣ Buscar caja registradora con relaciones necesarias
    const cashRegister = await this.service.cashRegister.findUnique({
      where: { id: dto.cashRegisterId },
      select: {
        id: true,
        description: true,
        businessId: true,
        branchId: true,
        collaborator: { select: { branchId: true } },
      },
    });

    if (!cashRegister) {
      throw new NotFoundException(`CashRegister with ID ${dto.cashRegisterId} not found`);
    }

    // 3️⃣ Validar que haya al menos un ítem de compra
    if (!dto.purchases || dto.purchases.length === 0) {
      throw new BadRequestException('At least one purchase item is required.');
    }

    // 4️⃣ Si el pago es parcial, registrar cliente si no existe
    const isPartialPayment = dto.amountCancelled < dto.totalAmount;
    const businessId = cashRegister.businessId;
    const branchId = cashRegister.branchId;

    if (isPartialPayment && branchId && dto.clientDNI) {
      const existingClient = await this.service.businessBranchClient.findFirst({
        where: { branchId, clientDNI: dto.clientDNI },
      });

      if (!existingClient) {
        await this.clientsService.addClient({
          branchId,
          clientName: dto.clientName,
          clientDNI: dto.clientDNI,
          userId: dto.userId ?? null,
        });
      }
    }

    // ⚙️ 5️⃣ Validar disponibilidad de todos los productos antes de crear la compra
    const unavailableProducts: string[] = [];

    for (const item of dto.purchases) {
      const stock = await this.service.productStock.findUnique({
        where: { id: item.productStockId },
        select: {
          id: true,
          availables: true,
          product: {
            select: {
              id: true,
              name: true,
              flavor: true,
              smell: true,
              brand: { select: { name: true } },
              category: { select: { id: true } },
            },
          },
        },
      });

      if (!stock) {
        throw new NotFoundException(`ProductStock with ID ${item.productStockId} not found`);
      }

      if (item.unitsOrMeasures > stock.availables && stock.product) {
        unavailableProducts.push(
          `${stock.product.name}, ${stock.product?.flavor ?? ''} ${stock.product?.smell ?? ''} ${stock.product?.brand?.name ?? ''} (disponible: ${stock.availables}, solicitado: ${item.unitsOrMeasures})`,
        );
      }
    }

    // 🚨 Si hay al menos un producto sin stock suficiente, abortar operación
    if (unavailableProducts.length > 0) {
      throw new BadRequestException({
        message:
          'La compra no pudo completarse. Algunos productos no tienen suficiente stock disponible.',
        unavailable: unavailableProducts,
      });
    }

    // ✅ 6️⃣ Si todo está disponible, proceder con la transacción
    return this.service.$transaction(async (tx) => {
      for (const item of dto.purchases) {
        // 🔹 Descontar stock
        const updatedStock = await tx.productStock.update({
          where: { id: item.productStockId },
          data: {
            availables: { decrement: item.unitsOrMeasures },
          },
          select: {
            id: true,
            product: { select: { category: { select: { id: true, name: true } } } },
          },
        });

        const categoryId = updatedStock.product?.category?.id ?? null;
        const totalToAdd = item.unitsOrMeasures * item.price;

        if (categoryId) {
          // 🔹 Buscar registro existente del mes actual
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

          const existingCategoryRecord = await tx.purchaseByCategory.findFirst({
            where: {
              categoryId,
              businessId,
              branchId,
              userId: dto.userId ?? null,
              createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
            select: { id: true, total: true },
          });

          if (existingCategoryRecord) {
            // 🔹 Si existe, incrementar el total
            await tx.purchaseByCategory.update({
              where: { id: existingCategoryRecord.id },
              data: { total: { increment: totalToAdd } },
            });
          } else {
            // 🔹 Si no existe, crear nuevo registro
            await tx.purchaseByCategory.create({
              data: {
                categoryId,
                businessId,
                branchId,
                userRef: dto.clientDNI ?? null,
                userId: dto.userId ?? null,
                total: totalToAdd,
                categoryRef: updatedStock.product?.category?.name ?? businessId,
              },
            });
          }
        }
      }

      // 🔹 Crear la compra principal y sus detalles
      const purchase = await tx.businessBranchPurchase.create({
        data: {
          clientName: dto.clientName ?? null,
          clientDNI: dto.clientDNI ?? null,
          userId: dto.userId ?? null,
          cashRegisterId: dto.cashRegisterId,
          amountCancelled: dto.amountCancelled,
          totalAmount: dto.totalAmount,
          status: dto.amountCancelled === dto.totalAmount ? 'pagado' : dto.status,
          purchases: {
            create: dto.purchases.map((item) => ({
              productStockId: item.productStockId,
              productId: item.productId,
              unitsOrMeasures: item.unitsOrMeasures,
              price: item.price,
            })),
          },
        },
        select: SELECT_FIELDS,
      });

      return {
        message: 'Compra registrada exitosamente.',
        data: purchase,
      };
    });
  }

  async getPurchaseSummaryByFilters(businessId?: string, branchId?: string, userId?: string) {
    if (!userId && !businessId && !branchId) {
      throw new BadRequestException(
        'Debe enviar al menos un identificador (userId, businessId o branchId)',
      );
    }

    // 🔹 Construimos filtros para las cajas registradoras
    const cashRegisterWhere: any = {};
    if (businessId) cashRegisterWhere.businessId = businessId;
    if (branchId) cashRegisterWhere.branchId = branchId;

    const cashRegisters = await this.service.cashRegister.findMany({
      where: cashRegisterWhere,
      select: { id: true },
    });

    const cashRegistersIds = cashRegisters.map((b) => b.id);

    // 🔹 Si no hay cajas registradoras relacionadas, retornar vacío
    if (!cashRegistersIds.length && !userId) {
      return {
        totalPurchases: 0,
        completed: 0,
        pending: 0,
        expired: 0,
        totalAmount: 0,
        completedAmount: 0,
        pendingAmount: 0,
        expiredAmount: 0,
      };
    }

    // 🔹 Construimos filtros dinámicos para las compras
    const where: any = {};

    if (userId?.length) where.userId = userId;
    if (cashRegistersIds.length) where.cashRegisterId = { in: cashRegistersIds };

    // 🔹 Buscamos las compras filtradas
    const purchases = await this.service.businessBranchPurchase.findMany({
      where,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        amountCancelled: true,
        expiredDate: true,
        createdAt: true,
      },
    });

    if (!purchases.length) {
      return {
        totalPurchases: 0,
        completed: 0,
        pending: 0,
        expired: 0,
        totalAmount: 0,
        completedAmount: 0,
        pendingAmount: 0,
        expiredAmount: 0,
      };
    }

    // 🔹 Inicializamos métricas
    const now = new Date();
    let completed = 0;
    let pending = 0;
    let expired = 0;
    let totalAmount = 0;
    let completedAmount = 0;
    let pendingAmount = 0;
    let expiredAmount = 0;

    // 🔹 Recorremos las compras
    for (const purchase of purchases) {
      const total = purchase.totalAmount ?? 0;
      const cancelled = purchase.amountCancelled ?? 0;
      const remaining = Math.max(total - cancelled, 0);
      totalAmount += total;

      switch (purchase.status) {
        case 'pagado':
          completed++;
          completedAmount += total;
          break;

        case 'pendiente':
          if (purchase.expiredDate && purchase.expiredDate < now) {
            expired++;
            expiredAmount += remaining;
          } else {
            pending++;
            pendingAmount += remaining;
          }
          break;
      }
    }

    // 🔹 Retornamos el resumen
    return {
      totalPurchases: purchases.length,
      completed,
      pending,
      expired,
      totalAmount,
      completedAmount,
      pendingAmount,
      expiredAmount,
    };
  }

  async myLastPurchase(userId?: string) {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }

    // Buscar la última compra general del usuario
    const lastPurchase = await this.service.businessBranchPurchase.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE_FIELDS,
    });

    if (!lastPurchase) {
      throw new NotFoundException('No purchases found for this user');
    }

    return lastPurchase;
  }

  async searchPendings(sub: string, branchId: string, search: string) {
    const collaborator = await this.service.businessBranchCollaborator.findFirst({
      where: { userId: sub, branchId: branchId },
    });
    if (!collaborator) {
      throw new NotFoundException('You must be a branch employee to obtain this information');
    }
    const where: Prisma.BusinessBranchPurchaseWhereInput = {};
    where.status = 'pendiente';

    // 🔹 Filtro por búsqueda general
    if (search) {
      where.OR = [{ user: { dni: search } }, { clientDNI: search }];
    }
    return this.service.businessBranchPurchase.findMany({
      where,
      select: SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByFilters(
    userId: string = '',
    branchId: string = '',
    page = 1,
    pageSize = 10,
    search = '',
    status = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedBusinessBranchPurchaseResponseDto> {
    // 🔹 Validación de paginación
    page = Math.max(1, page);
    pageSize = Math.max(1, pageSize);
    const skip = (page - 1) * pageSize;

    // 🔹 Validación del campo de fecha
    const validDateKeys = ['createdAt', 'expiredDate'];
    if (!validDateKeys.includes(dateKey)) {
      dateKey = 'createdAt';
    }

    const where: Prisma.BusinessBranchPurchaseWhereInput = {};
    // 🔹 Filtro por branchId (nuevo)
    if (userId?.length) {
      where.userId = userId;
    }
    // 🔹 Filtro por branchId (nuevo)
    if (branchId?.length) {
      where.cashRegister = {
        branchId: branchId,
      };
    }

    // 🔹 Filtro por búsqueda general
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { username: { contains: search } } },
        { user: { dni: { contains: search } } },
        { clientName: { contains: search } },
        { clientDNI: { contains: search } },
        { cashRegister: { description: { contains: search } } },
        { cashRegister: { business: { name: { contains: search } } } },
        { cashRegister: { branch: { country: { contains: search } } } },
        { cashRegister: { branch: { state: { contains: search } } } },
        { cashRegister: { branch: { city: { contains: search } } } },
        { cashRegister: { branch: { address: { contains: search } } } },
      ];
    }

    // 🔹 Filtro por estado
    if (status && status !== 'Todos') {
      where.status = status as any;
    }

    // 🔹 Filtro por rango de fechas
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

    // 🔹 Consultas en paralelo (total y data)
    const [total, data] = await Promise.all([
      this.service.businessBranchPurchase.count({ where }),
      this.service.businessBranchPurchase.findMany({
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

  async myLastSale(businessId?: string, branchId?: string) {
    // 🔹 Construimos filtros dinámicos
    const where: any = {};

    if (branchId?.length) {
      where.branchId = branchId;
    } else if (businessId) {
      where.businessId = businessId;
    }

    // Buscar la última compra general del usuario
    const lastSale = await this.service.businessBranchPurchase.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: INCLUDE_FIELDS,
    });

    if (!lastSale) {
      throw new NotFoundException('No purchases found for this business');
    }

    return lastSale;
  }

  async update(id: string, dto: UpdateBusinessBranchPurchaseDto) {
    const purchase = await this.service.businessBranchPurchase.findUnique({ where: { id } });

    if (!purchase) {
      throw new NotFoundException(`BusinessBranchPurchase with ID ${id} not found`);
    }

    return this.service.businessBranchPurchase.update({
      where: { id },
      data: {
        amountCancelled: dto.amountCancelled ?? purchase.amountCancelled,
        status: dto.amountCancelled == purchase.totalAmount ? 'pagado' : purchase.status,
      },
    });
  }
}
