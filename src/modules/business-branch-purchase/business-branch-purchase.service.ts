import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessBranchPurchaseDto } from './dto/create-business-branch-purchase.dto';
import { PaginatedBusinessBranchPurchaseResponseDto } from './dto/paginated-business-branch-purchase-response.dto';
import { Prisma } from '@prisma/client';
import { ClientsService } from '../clients/clients.service';
import { UpdateBusinessBranchPurchaseDto } from './dto/update-business-branch-purchase.dto';
import { PatchBusinessBranchPurchaseDto } from './dto/patch-business-branch-purchase.dto';

import { MetricsWsService } from '../metrics-ws/metrics-ws.service';

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
  ticketNumber: true,
  approvedByClient: true,
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
      productStockId: true,
      unitsOrMeasures: true,
      price: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          name: true,
          exemptFromVAT: true,
          flavor: true,
          measurement: true,
          priceCalculation: true,
          smell: true,
          status: true,
          unitMeasurement: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      },
    },
  },
  purchasesBillPaymentMethod: {
    select: {
      id: true,
      amountCancelled: true,
      businessBranchPurchaseId: true,
      businessBranchPurchase: true,
      billPaymentMethodId: true,
      billPaymentMethod: true,
      createdAt: true,
    },
  },
};
@Injectable()
export class BusinessBranchPurchaseService {
  constructor(
    private readonly service: PrismaService,
    private clientsService: ClientsService,
    private readonly metricsWs: MetricsWsService,
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

          const existingCategoryRecord = await tx.saleByCategory.findFirst({
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
            await tx.saleByCategory.update({
              where: { id: existingCategoryRecord.id },
              data: { total: { increment: totalToAdd } },
            });
          } else {
            // 🔹 Si no existe, crear nuevo registro
            await tx.saleByCategory.create({
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
      // 🧮 Obtener el ticketNumber más alto para el branch actual
      const lastTicket = await tx.businessBranchPurchase.findFirst({
        where: { cashRegister: { branchId } },
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      });

      // 🎫 Generar nuevo ticketNumber autoincremental
      const newTicketNumber = (lastTicket?.ticketNumber ?? 0) + 1;
      // 🔹 Crear la compra principal y sus detalles
      const purchase = await tx.businessBranchPurchase.create({
        data: {
          ticketNumber: newTicketNumber,
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

      if (dto.userId) {
        this.metricsWs.emitPurchaseToUser(dto.userId, {
          message: 'Nueva compra registrada',
          purchase,
        });
      }

      // Registrar metodos de pago de la compra
      for (const item of dto.purchasesBillPaymentMethod) {
        await tx.purchaseBillPaymentMethod.create({
          data: {
            amountCancelled: item.amountCancelled,
            billPaymentMethodId: item.billPaymentMethodId,
            businessBranchPurchaseId: purchase.id,
          },
        });
      }

      return {
        message: 'Factura registrada exitosamente.',
        data: purchase,
      };
    });
  }

  async patch(id: string, dto: PatchBusinessBranchPurchaseDto) {
    const purchase = await this.service.businessBranchPurchase.findUnique({ where: { id } });

    if (!purchase) {
      throw new NotFoundException(`BusinessBranchPurchase with ID ${id} not found`);
    }

    await this.service.purchaseBillPaymentMethod.deleteMany({
      where: { businessBranchPurchaseId: purchase.id },
    });

    // Registrar metodos de pago de la compra
    for (const item of dto.purchasesBillPaymentMethod) {
      await this.service.purchaseBillPaymentMethod.create({
        data: {
          amountCancelled: item.amountCancelled,
          billPaymentMethodId: item.billPaymentMethodId,
          businessBranchPurchaseId: purchase.id,
        },
      });
    }

    return this.service.businessBranchPurchase.update({
      where: { id },
      data: {
        amountCancelled: dto.amountCancelled ?? purchase.amountCancelled,
        status: dto.status ?? 'pendiente',
      },
    });
  }

  async update(id: string, dto: UpdateBusinessBranchPurchaseDto) {
    const purchase = await this.service.businessBranchPurchase.findUnique({ where: { id } });

    if (!purchase) {
      throw new NotFoundException(`BusinessBranchPurchase with ID ${id} not found`);
    }

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

    const businessId = cashRegister.businessId;
    const branchId = cashRegister.branchId;

    // ⚙️ Validar disponibilidad de todos los productos antes de crear la compra
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

      if (
        (item.id &&
          item.prevUnitsOrMeasures &&
          item.unitsOrMeasures - item.prevUnitsOrMeasures > stock.availables) ||
        (item.id == undefined && item.unitsOrMeasures > stock.availables && stock.product)
      ) {
        unavailableProducts.push(
          `${stock.product?.name}, ${stock.product?.flavor ?? ''} ${stock.product?.smell ?? ''} ${stock.product?.brand?.name ?? ''} (disponible: ${stock.availables}, solicitado: ${item.id && item.prevUnitsOrMeasures ? item.unitsOrMeasures - item.prevUnitsOrMeasures : item.unitsOrMeasures})`,
        );
      }
    }

    // 🚨 Si hay al menos un producto sin stock suficiente, abortar operación
    if (unavailableProducts.length > 0) {
      throw new BadRequestException({
        message:
          'La operación no pudo completarse. Algunos productos no tienen suficiente stock disponible.',
        unavailable: unavailableProducts,
      });
    }

    // ✅ Si todo está disponible, proceder con la transacción
    return this.service.$transaction(async (tx) => {
      for (const item of dto.purchases) {
        if (item.id) {
          await tx.purchase.update({
            where: { id: item.id },
            data: { unitsOrMeasures: item.unitsOrMeasures },
          });
        } else {
          await tx.purchase.create({
            data: {
              businessBranchPurchaseId: purchase.id,
              businessBranchPurchaseRef: purchase.id,
              productStockId: item.productStockId,
              productId: item.productId,
              unitsOrMeasures: item.unitsOrMeasures,
              price: item.price,
            },
          });
        }

        // 🔹 Descontar stock
        const updatedStock = await tx.productStock.update({
          where: { id: item.productStockId },
          data: {
            availables: {
              decrement:
                item.id && item.prevUnitsOrMeasures
                  ? item.unitsOrMeasures - item.prevUnitsOrMeasures
                  : item.unitsOrMeasures,
            },
          },
          select: {
            id: true,
            product: { select: { category: { select: { id: true, name: true } } } },
          },
        });

        const categoryId = updatedStock.product?.category?.id ?? null;
        const totalToAdd =
          item.id && item.prevUnitsOrMeasures
            ? (item.unitsOrMeasures - item.prevUnitsOrMeasures) * item.price
            : item.unitsOrMeasures * item.price;

        if (categoryId) {
          // 🔹 Buscar registro existente del mes actual
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

          const existingCategoryRecord = await tx.saleByCategory.findFirst({
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
            await tx.saleByCategory.update({
              where: { id: existingCategoryRecord.id },
              data: { total: { increment: totalToAdd } },
            });
          } else {
            // 🔹 Si no existe, crear nuevo registro
            await tx.saleByCategory.create({
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

      const updatedPurchase = await tx.businessBranchPurchase.update({
        where: { id },
        data: {
          totalAmount: dto.totalAmount ?? purchase.totalAmount,
          amountCancelled: dto.amountCancelled ?? purchase.amountCancelled,
          status: dto.status ?? 'pendiente',
        },
      });

      if (dto.userId) {
        this.metricsWs.emitPurchaseToUser(dto.userId, {
          message: 'Factura actualizada',
          updatedPurchase,
        });
      }

      if (dto.status != 'no_procesado') {
        // Registrar metodos de pago de la compra
        await tx.purchaseBillPaymentMethod.deleteMany({
          where: { businessBranchPurchaseId: purchase.id },
        });
        for (const item of dto.purchasesBillPaymentMethod) {
          await tx.purchaseBillPaymentMethod.create({
            data: {
              amountCancelled: item.amountCancelled,
              billPaymentMethodId: item.billPaymentMethodId,
              businessBranchPurchaseId: purchase.id,
            },
          });
        }
      }

      return {
        message:
          dto.status == 'no_procesado'
            ? 'Cuenta actualizada exitosamente.'
            : 'Factura actualizada exitosamente.',
        data: updatedPurchase,
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
      const searchNumber = Number(search);
      where.OR = [
        // Si search es un número válido, filtra por ticketNumber
        ...(Number.isInteger(searchNumber) ? [{ ticketNumber: searchNumber }] : []),

        // Otros campos tipo string:
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

  async approve(requestingUserID: string, businessBranchPurchaseId: string, approve: boolean) {
    const result = await this.service.businessBranchPurchase.update({
      where: { id: businessBranchPurchaseId },
      data: { approvedByClient: approve },
      select: SELECT_FIELDS,
    });
    if (requestingUserID) {
      const user = await this.service.user.findUnique({
        where: { id: requestingUserID },
        select: { id: true, dni: true },
      });
      if (user) {
        // 🔹 Recorremos las compras
        for (const purchase of result.purchases) {
          const categoryId = purchase.product?.category?.id ?? null;
          // TODO reemplazar el valor fijo de IVA por una variable
          const totalToAdd = purchase.product?.exemptFromVAT
            ? purchase.unitsOrMeasures * parseFloat(purchase.price.toFixed(3))
            : purchase.unitsOrMeasures *
              parseFloat((purchase.price + purchase.price * 0.16).toFixed(3));
          if (categoryId) {
            // 🔹 Buscar registro existente del mes actual
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const existingCategoryRecord = await this.service.purchaseByCategory.findFirst({
              where: {
                categoryId,
                userId: user.id ?? null,
                createdAt: { gte: startOfMonth, lte: endOfMonth },
              },
              select: { id: true, total: true },
            });

            if (existingCategoryRecord) {
              // 🔹 Si existe, incrementar el total
              await this.service.purchaseByCategory.update({
                where: { id: existingCategoryRecord.id },
                data: { total: { increment: totalToAdd } },
              });
            } else {
              // 🔹 Si no existe, crear nuevo registro
              await this.service.purchaseByCategory.create({
                data: {
                  categoryId,
                  userRef: user.dni ?? null,
                  userId: user.id ?? null,
                  total: totalToAdd,
                  categoryRef: purchase.product?.category?.name ?? categoryId,
                },
              });
            }
          }
        }
      }
    }
    return result;
  }
}
