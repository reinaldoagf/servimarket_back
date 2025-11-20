// src/business/business.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessBranch, Prisma, BusinessType } from '@prisma/client';
import { PaginatedBusinessResponseDto } from './dto/paginated-business-response.dto';

interface CreateBusinessInput {
  name: string;
  rif?: string;
  type?: BusinessType;
  ownerId: string;
  branches: { country: string; state: string; city: string; address: string; phone: string; currencyId: string, schedule247: boolean, itsOpen: boolean, businessHours: string }[];
  logo?: string | null;
}

class BranchUpdateInput {
  id?: string; // si existe, se actualiza, si no, se crea
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  phone?: string;
  schedule247?: boolean;
  businessHours?: string;
  currencyId?: string | null;
}

interface UpdateBusinessInput {
  name?: string;
  rif?: string;
  type?: BusinessType;
  logo?: string | null;

  branches?: BranchUpdateInput[];
}

const SELECT_FIELDS = {
  id: true,
  rif: true,
  name: true,
  logo: true,
  type: true,
  branches: true,
  subscriptionPlan: true,
  subscriptionDate: true,
  expirationDate: true,
  owner: true,
  settings: true,
  createdAt: true,
};

@Injectable()
export class BusinessService {
  constructor(private service: PrismaService) {}

  async getById(requestingUserID: string, id: string) {
    const business = await this.service.business.findUnique({
      where: { id, ownerId: requestingUserID },
      select: SELECT_FIELDS,
    });
    if (!business) throw new NotFoundException(`Business with id ${id} not found`);
    return business;
  }

  async getByFilters(
    country = '',
    state = '',
    city = '',
    page = 1,
    pageSize = 10,
    search = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedBusinessResponseDto> {
    const skip = (page - 1) * pageSize;

    // Construimos los filtros dinámicamente
    const where: Prisma.BusinessWhereInput = {};

    if (search) {
      const enumValues = [
        'minimercado',
        'supermercado',
        'hypermercado',
        'farmacia',
        'panaderia',
        'otro',
      ];

      const matchedEnum = enumValues.find(v =>
        v.toLowerCase().includes(search.toLowerCase()),
      );

      where.OR = [
        { name: { contains: search } },
      ];

      if (matchedEnum) {
        where.OR.push({ type: { equals: matchedEnum as BusinessType } });
      }
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

    // 📍 Filtros geográficos: buscamos negocios con branches que coincidan
    const branchFilter: Prisma.BusinessBranchWhereInput = {};

    if (country) branchFilter.country = { equals: country };
    if (state) branchFilter.state = { equals: state };
    if (city) branchFilter.city = { equals: city };

    // Si hay al menos un filtro de localización, lo añadimos al where principal
    if (Object.keys(branchFilter).length > 0) {
      where.branches = {
        some: branchFilter,
      };
    }

    const [total, data] = await Promise.all([
      this.service.business.count({ where }),
      this.service.business.findMany({
        where,
        select: {
          ...SELECT_FIELDS,
          subscriptionPlan: false,
          subscriptionDate: false,
          expirationDate: false,
          owner: false,
          settings: false,
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

  async create(input: CreateBusinessInput) {
    const owner = await this.service.user.findUnique({
      where: { id: input.ownerId },
    });

    if (!owner) {
      throw new NotFoundException(`Owner with id ${input.ownerId} not found`);
    }

    // 🚨 Ajusta estos valores si deseas manejar planes de suscripción por defecto
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() + 1);

    try {
      const business = await this.service.business.create({
        data: {
          name: input.name,
          rif: input.rif,
          type: input.type,
          logo: input.logo,
          ownerId: input.ownerId,
          subscriptionDate: new Date(),
          expirationDate: expiredDate,
          branches: {
            create: input.branches.map((b) => ({
              country: b.country,
              state: b.state,
              city: b.city,
              address: b.address,
              phone: b.phone,
              schedule247: b.schedule247,
              businessHours: b.businessHours,
              currencyId: b.currencyId ?? null,
            })),
          },
        },
        include: {
          branches: true,
          owner: true,
        },
      });

      await this.service.setting.create({
        data: {
          key: 'profit_percentage',
          floatValue: 16,
          businessId: business.id,
        },
      });

      // 🔹 Buscar todas las sucursales creadas
      const branches = await this.service.businessBranch.findMany({
        where: { businessId: business.id },
        select: { id: true },
      });

      // 🔹 Crear los colaboradores administradores (de forma concurrente y controlada)
      await Promise.all(
        branches.map((b: BusinessBranch) =>
          this.service.businessBranchCollaborator.create({
            data: {
              branchId: b.id,
              userId: input.ownerId,
              cashRegisterId: null,
              isAdmin: true,
            },
          }),
        ),
      );

      return business;
    } catch (err: any) {
      throw new BadRequestException(`Error creating business: ${err.message}`);
    }
  }
  async update(id: string, input: UpdateBusinessInput) {
    // Obtener negocio actual (incluye sucursales existentes)
    const existing = await this.service.business.findUnique({
      where: { id },
      include: { branches: true },
    });

    if (!existing) {
      throw new NotFoundException('Business not found');
    }

    // -------------------------------
    // 1. Determinar branches existentes
    // -------------------------------
    const existingBranchIds = existing.branches.map(b => b.id);

    if(input.branches) {
    // IDs enviados por el cliente
    const incomingBranchIds = input.branches.filter(b => !!b.id).map(b => b.id);

    // Branches a eliminar (existen en DB pero no vienen en input)
    const branchesToDelete = existingBranchIds.filter(
      id => !incomingBranchIds.includes(id)
    );

    // -------------------------------
    // 2. Preparar operaciones de update/create
    // -------------------------------
      
    const branchesUpdateOps = input.branches
      .filter(b => !!b.id)
      .map(b => ({
        where: { id: b.id },
        data: {
          country: b.country ?? '',
          state: b.state ?? '',
          city: b.city ?? '',
          address: b.address ?? '',
          phone: b.phone ?? '',
          schedule247: b.schedule247,
          businessHours: b.businessHours,
          currencyId: b.currencyId ?? null,
        },
      }));

    const branchesCreateOps = input.branches
      .filter(b => !b.id)
      .map(b => ({
        country: b.country ?? '',
        state: b.state ?? '',
        city: b.city ?? '',
        address: b.address ?? '',
        phone: b.phone ?? '',
        schedule247: b.schedule247,
        businessHours: b.businessHours,
        currencyId: b.currencyId ?? null,
      }));

    // -------------------------------
    // 3. Realizar la actualización
    // -------------------------------
    const updated = await this.service.business.update({
      where: { id },
      data: {
        // Campos editables
        name: input.name,
        rif: input.rif,
        type: input.type ?? existing.type,
        logo: input.logo,

        // ❗ Campos que NO deben modificarse
        // ownerId: KEEP
        // subscriptionDate: KEEP
        // expirationDate: KEEP

        branches: {
          deleteMany: {
            id: { in: branchesToDelete },
          },
          update: branchesUpdateOps,
          create: branchesCreateOps,
        },
      },
      include: {
        branches: true,
        owner: true,
      },
    });

    return updated;
    }
  }
  async delete(id: string) {
    // Verificar si existe antes de eliminar
    const business = await this.service.business.findUnique({ where: { id } });

    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found`);
    }
    const branches = await this.service.businessBranch.findMany({
      where: { businessId: id },
      select: { id: true },
    });

    const branchIds = branches.map((b) => b.id);

    // 🔹 Si existen dependencias (ejemplo: pendings ligados a branchId), borrarlas primero
    if (branchIds.length > 0) {
      await this.service.productStock.deleteMany({
        where: { branchId: { in: branchIds } },
      });
      await this.service.businessBranchCollaborator.deleteMany({
        where: { branchId: { in: branchIds } },
      });
      await this.service.businessBranchClient.deleteMany({
        where: { branchId: { in: branchIds } },
      });
      await this.service.businessBranchSupplier.deleteMany({
        where: { branchId: { in: branchIds } },
      });
      await this.service.pending.deleteMany({
        where: { branchId: { in: branchIds } },
      });
    }

    // 🔹 Luego borrar los branches
    await this.service.businessBranch.deleteMany({
      where: { businessId: id },
    });

    // 🔹 Finalmente borrar el business
    return this.service.business.delete({
      where: { id },
    });
  }
  async updateBranchAvailability(branchId: string, itsOpen: boolean) {
    return this.service.businessBranch.update({
      where: { id: branchId },
      data: { itsOpen },
    });
  }
}
