// src/collaborators/collaborators.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { PaginatedCollaboratorResponseDto } from './dto/paginated-collaborator-response.dto';

@Injectable()
export class CollaboratorsService {
  constructor(private prisma: PrismaService) {}
  async getByFilters(
    businessId?: string | null,
    branchId?: string | null,
    page = 1,
    pageSize = 10,
    search = '',
    status = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedCollaboratorResponseDto> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.BusinessBranchCollaboratorWhereInput = {};

    // 🔹 Filtro por businessId si existe
    if (branchId?.length) {
      where.branchId = branchId; // 👈 ya existe como campo directo en BusinessBranchCollaborator
    } else if (businessId) {
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

    const [total, collaborators] = await Promise.all([
      this.prisma.businessBranchCollaborator.count({ where }),
      this.prisma.businessBranchCollaborator.findMany({
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
    const data = collaborators.map((c) => ({
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

  async addCollaborator(dto: CreateCollaboratorDto) {
    const branch = await this.prisma.businessBranch.findUnique({
      where: { id: dto.branchId },
      include: { business: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    /* // Validar que el colaborador no sea el owner
    if () {
      throw new BadRequestException('Owner cannot be added as user');
    } */

    // Validar si ya existe
    const existing = await this.prisma.businessBranchCollaborator.findFirst({
      where: { branchId: dto.branchId, userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException('Collaborator is already a user of this branch');
    }

    // Crear el colaborador
    return this.prisma.businessBranchCollaborator.create({
      data: {
        branchId: dto.branchId,
        userId: dto.userId,
        isAdmin: dto.isAdmin || branch?.business?.ownerId === dto.userId,
      },
    });
  }

  async deleteCollaborator(id: string) {
    // Verificar si existe antes de eliminar
    const collaborator = await this.prisma.businessBranchCollaborator.findUnique({
      where: { id },
    });

    if (!collaborator) {
      throw new NotFoundException(`Collaborator with ID ${id} not found`);
    }

    return this.prisma.businessBranchCollaborator.delete({
      where: { id },
    });
  }
}
