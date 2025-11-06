// src/clients/clients.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateClientDto } from './dto/create-client.dto';
import { PaginatedClientResponseDto } from './dto/paginated-client-response.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}
  async getByFilters(
    businessId?: string | null,
    page = 1,
    pageSize = 10,
    search = '',
    status = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedClientResponseDto> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.BusinessBranchClientWhereInput = {};

    // 🔹 Filtro por businessId si existe
    if (businessId) {
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

    const [total, clients] = await Promise.all([
      this.prisma.businessBranchClient.count({ where }),
      this.prisma.businessBranchClient.findMany({
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
    const data = clients.map((c) => ({
      id: c.id,
      user: c.user,
      branch: c.branch,
      clientName: c.clientName,
      clientDNI: c.clientDNI,
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

  async addClient(dto: CreateClientDto) {
    const branch = await this.prisma.businessBranch.findUnique({
      where: { id: dto.branchId },
      include: { business: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Validar que el colaborador no sea el owner
    if (branch.business?.ownerId === dto.userId) {
      throw new BadRequestException('Owner cannot be added as user');
    }

    // Validar si ya existe
    const existing = await this.prisma.businessBranchClient.findFirst({
      where: { branchId: dto.branchId, userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException('Client is already a user of this branch');
    }

    // Crear el colaborador
    return this.prisma.businessBranchClient.create({
      data: {
        branchId: dto.branchId,
        clientName: dto.clientName ?? null,
        clientDNI: dto.clientDNI ?? null,
        userId: dto.userId ?? null,
      },
    });
  }
  async deleteClient(id: string) {
    // Verificar si existe antes de eliminar
    const client = await this.prisma.businessBranchClient.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return this.prisma.businessBranchClient.delete({
      where: { id },
    });
  }
}
