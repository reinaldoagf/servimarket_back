import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessBranchPurchaseDto } from './dto/create-business-branch-purchase.dto';
import { PaginatedBusinessBranchPurchaseResponseDto } from './dto/paginated-business-branch-purchase-response.dto';
import { Prisma } from '@prisma/client';
import { ClientsService } from '../clients/clients.service';
import { UpdateBusinessBranchPurchaseDto } from './dto/update-business-branch-purchase.dto';

@Injectable()
export class BusinessBranchPurchaseService {
  constructor(
    private readonly service: PrismaService,
    private clientsService: ClientsService,
  ) {}

  private readonly INCLUDE_FIELDS = {
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

  private readonly SELECT_FIELDS = {
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

    // 5️⃣ Crear la compra principal con sus detalles
    return this.service.businessBranchPurchase.create({
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
            productId: item.productId,
            unitsOrMeasures: item.unitsOrMeasures,
            price: item.price,
          })),
        },
      },
      select: this.SELECT_FIELDS, // asumo que ya está definido en tu clase
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
      include: this.INCLUDE_FIELDS,
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
      where.OR = [
        { user: { dni: search } },
        { clientDNI: search },
      ];
    }
    return this.service.businessBranchPurchase.findMany({
      where,
      select: this.SELECT_FIELDS,
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
        select: this.SELECT_FIELDS,
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
      include: this.INCLUDE_FIELDS,
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
  /* 
  async deleteById(id: string) {
    const existing = await this.service.businessBranchPurchase.findUnique({
      where: { id },
      include: { purchases: true },
    });

    if (!existing) throw new NotFoundException(`Purchase with ID ${id} not found`);

    // Eliminar primero los registros hijos (purchases)
    await this.service.purchase.deleteMany({ where: { businessBranchPurchaseId: id } });

    await this.service.businessBranchPurchase.delete({ where: { id } });

    return { message: `Purchase ${id} and its items were deleted successfully.` };
  }

  


  

  */
}
