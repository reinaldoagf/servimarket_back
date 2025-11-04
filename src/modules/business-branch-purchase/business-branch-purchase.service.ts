import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessBranchPurchaseDto } from './dto/create-business-branch-purchase.dto';
import { PaginatedBusinessBranchPurchaseResponseDto } from './dto/paginated-business-branch-purchase-response.dto';
import { Prisma } from '@prisma/client';
import { ClientsService } from '../clients/clients.service';
import { PurchaseStatus } from '@prisma/client';
import { UpdateBusinessBranchPurchaseDto } from './dto/update-business-branch-purchase.dto';

@Injectable()
export class BusinessBranchPurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private clientsService: ClientsService,
  ) {}

  private readonly INCLUDE_FIELDS = {
    business: {
      select: { id: true, name: true },
    },
    branch: {
      select: { id: true, city: true, address: true },
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
        productPresentation: {
          select: {
            id: true,
            flavor: true,
            measurementQuantity: true,
            packing: true,
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
    businessId: true,
    branchId: true,
    amountCancelled: true,
    totalAmount: true,
    status: true,
    createdAt: true,
    branch: { select: { id: true, address: true } },
    business: { select: { id: true, name: true, rif: true, logo: true } },
    user: { select: { id: true, name: true, email: true, avatar: true } },
    purchases: {
      select: {
        id: true,
        productId: true,
        productPresentationId: true,
        unitsOrMeasures: true,
        price: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
        productPresentation: {
          select: { id: true, measurementQuantity: true, flavor: true, packing: true },
        },
      },
    },
  };

  async create(dto: CreateBusinessBranchPurchaseDto) {
    const branch = await this.prisma.businessBranch.findUnique({ where: { id: dto.branchId } });
    if (!branch) throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);

    const business = await this.prisma.business.findUnique({ where: { id: dto.businessId } });
    if (!business) throw new NotFoundException(`Business with ID ${dto.businessId} not found`);

    if (!dto.purchases || dto.purchases.length === 0) {
      throw new BadRequestException('At least one purchase item is required.');
    }

    if (dto.amountCancelled < dto.totalAmount && dto.branchId && dto.userId) {
      // Validar si ya existe
      const existing = await this.prisma.businessBranchClient.findFirst({
        where: { branchId: dto.branchId, userId: dto.userId },
      });

      if (!existing) {
        await this.clientsService.addClient({ branchId: dto.branchId, userId: dto.userId });
      }
    }

    // Crear la compra con sus detalles
    return this.prisma.businessBranchPurchase.create({
      data: {
        clientName: dto.clientName,
        clientDNI: dto.clientDNI,
        userId: dto.userId,
        businessId: dto.businessId,
        branchId: dto.branchId,
        amountCancelled: dto.amountCancelled,
        totalAmount: dto.totalAmount,
        status: dto.amountCancelled === dto.totalAmount ? 'pagado' : dto.status,
        purchases: {
          create: dto.purchases.map((item) => ({
            productId: item.productId,
            productPresentationId: item.productPresentationId ?? null,
            unitsOrMeasures: item.unitsOrMeasures,
            price: item.price,
          })),
        },
      },
      select: this.SELECT_FIELDS,
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
    const skip = (page - 1) * pageSize;
    const where: Prisma.BusinessBranchPurchaseWhereInput = {};

    if (userId?.length) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
      where.userId = userId;
    }

    if (branchId?.length) {
      const branch = await this.prisma.businessBranch.findUnique({ where: { id: branchId } });
      if (!branch) throw new NotFoundException(`Branch with ID ${branchId} not found`);
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { username: { contains: search } } },
        { user: { dni: { contains: search } } },
        { business: { name: { contains: search } } },
        { branch: { country: { contains: search } } },
        { branch: { state: { contains: search } } },
        { branch: { city: { contains: search } } },
        { branch: { address: { contains: search } } },
        { clientName: { contains: search } },
        { clientDNI: { contains: search } },
      ];
    }

    if (status && status !== 'Todos') {
      where.status = status as any; // casteamos porque viene como string
    }

    if (startDate && endDate) {
      where[dateKey] = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (startDate) {
      where[dateKey] = { gte: new Date(startDate) };
    } else if (endDate) {
      where[dateKey] = { lte: new Date(endDate) };
    }

    const [total, data] = await Promise.all([
      this.prisma.businessBranchPurchase.count({ where }),
      this.prisma.businessBranchPurchase.findMany({
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

  async deleteById(id: string) {
    const existing = await this.prisma.businessBranchPurchase.findUnique({
      where: { id },
      include: { purchases: true },
    });

    if (!existing) throw new NotFoundException(`Purchase with ID ${id} not found`);

    // Eliminar primero los registros hijos (purchases)
    await this.prisma.purchase.deleteMany({ where: { businessBranchPurchaseId: id } });

    await this.prisma.businessBranchPurchase.delete({ where: { id } });

    return { message: `Purchase ${id} and its items were deleted successfully.` };
  }

  async getPurchaseSummaryByFilters(businessId?: string, branchId?: string, userId?: string) {
    if (!userId && !businessId && !branchId) {
      throw new BadRequestException(
        'Debe enviar al menos un identificador (userId, businessId o branchId)',
      );
    }

    // 🔹 Construimos filtros dinámicos
    const where: any = {};

    if (userId?.length) where.userId = userId;
    if (businessId) where.businessId = businessId;
    if (branchId?.length) where.branchId = branchId;

    // 🔹 Buscamos las compras filtradas
    const purchases = await this.prisma.businessBranchPurchase.findMany({
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

    // 🔹 Recorremos las compras para calcular métricas
    for (const purchase of purchases) {
      const remaining = purchase.totalAmount - (purchase.amountCancelled ?? 0);
      totalAmount += purchase.totalAmount;

      switch (purchase.status) {
        case 'pagado':
          completed++;
          completedAmount += purchase.totalAmount;
          break;

        case 'pendiente':
          if (purchase.expiredDate && purchase.expiredDate < now) {
            expired++;
            expiredAmount += Math.max(remaining, 0);
          } else {
            pending++;
            pendingAmount += Math.max(remaining, 0);
          }
          break;
      }
    }

    // 🔹 Devolvemos el resumen
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

  async update(id: string, dto: UpdateBusinessBranchPurchaseDto) {
    const purchase = await this.prisma.businessBranchPurchase.findUnique({ where: { id } });

    if (!purchase) {
      throw new NotFoundException(`BusinessBranchPurchase with ID ${id} not found`);
    }

    return this.prisma.businessBranchPurchase.update({
      where: { id },
      data: {
        amountCancelled: dto.amountCancelled ?? purchase.amountCancelled,
        status: dto.amountCancelled == purchase.totalAmount ? 'pagado' : purchase.status,
      },
    });
  }

  async myLastPurchase(userId?: string) {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }

    // Buscar la última compra general del usuario
    const lastPurchase = await this.prisma.businessBranchPurchase.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: this.INCLUDE_FIELDS,
    });

    if (!lastPurchase) {
      throw new NotFoundException('No purchases found for this user');
    }

    return lastPurchase;
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
    const lastSale = await this.prisma.businessBranchPurchase.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.INCLUDE_FIELDS,
    });

    if (!lastSale) {
      throw new NotFoundException('No purchases found for this business');
    }

    return lastSale;
  }
}
