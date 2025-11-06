// src/business/business.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessBranch, Prisma } from '@prisma/client';
import { PaginatedBusinessResponseDto } from './dto/paginated-business-response.dto';

interface CreateBusinessInput {
  name: string;
  rif?: string;
  description?: string;
  ownerId: string;
  branches: { country: string; state: string; city: string; address: string; phone: string; currencyId: string }[];
  logo?: string | null;
}

const SELECT_FIELDS = {
  id: true,
  rif: true,
  name: true,
  logo: true,
  description: true,
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
      where.OR = [{ name: { contains: search } }];
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
          description: input.description || '',
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
              currencyId: b.currencyId ?? null,
            })),
          },
        },
        include: {
          branches: true,
          owner: true,
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
}
