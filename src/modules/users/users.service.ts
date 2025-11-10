// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUserResponseDto } from './dto/paginated-user-response.dto';

import * as bcrypt from 'bcrypt';

const SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  status: true,
  dni: true,
  dniFile: true,
  createdAt: true,
  roleId: true,
  country: true,
  state: true,
  city: true,
  avatar: true,
  businessId: true,
};

@Injectable()
export class UsersService {
  constructor(private service: PrismaService) {}

  async getByFilters(
    page = 1,
    pageSize = 10,
    search = '',
    status = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedUserResponseDto> {
    const skip = (page - 1) * pageSize;

    // Construimos los filtros dinámicamente
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
        { dni: { contains: search } },
      ];
    }

    if (status) {
      where.status = status as any; // casteamos porque viene como string
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

    const [total, data] = await Promise.all([
      this.service.user.count({ where }),
      this.service.user.findMany({
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

  async findOne(id: string): Promise<UserResponseDto | null> {
    return this.service.user.findUnique({
      where: { id: id },
      select: SELECT_FIELDS,
    });
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const hashedPassword: string = await bcrypt.hash(dto.password, 10);

    const data: Prisma.UserCreateInput = {
      email: dto.email,
      name: dto.name,
      username: dto.username,
      dni: dto.dni,
      dniFile: dto.dniFile,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      password: hashedPassword,
      status: dto.status,
    };

    const user = await this.service.user.create({ data });

    return user;
  }
}
