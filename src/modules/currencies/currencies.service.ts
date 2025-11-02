import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrencyResponseDto } from './dto/currency-response.dto';
import { PaginatedCurrencyResponseDto } from './dto/paginated-currency-response.dto';

@Injectable()
export class CurrenciesService {
  constructor(private readonly service: PrismaService) {}

  async create(data: CreateCurrencyDto): Promise<CurrencyResponseDto> {
    return this.service.currency.create({ data });
  }
  async findAll(): Promise<CurrencyResponseDto[]> {
    return this.service.currency.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
  async getByFilters(
    page = 1,
    pageSize = 10,
    search = '',
    dateKey = 'createdAt',
    startDate = '',
    endDate = '',
  ): Promise<PaginatedCurrencyResponseDto> {
    const skip = (page - 1) * pageSize;

    // Construimos los filtros dinámicamente
    const where: Prisma.CurrencyWhereInput = {};

    if (search) {
      where.OR = [{ name: { contains: search } }];
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { symbol: { contains: search } },
        { country: { contains: search } },
        { coin: { contains: search } },
      ];
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
      this.service.currency.count({ where }),
      this.service.currency.findMany({
        where,
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

  async findOne(id: string): Promise<CurrencyResponseDto> {
    const currency = await this.service.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException(`Currency with id ${id} not found`);
    return currency;
  }

  async update(id: string, data: UpdateCurrencyDto): Promise<CurrencyResponseDto> {
    await this.findOne(id); // Valida existencia
    return this.service.currency.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id); // Valida existencia
    await this.service.currency.delete({ where: { id } });
    return { message: `Currency with id ${id} deleted successfully` };
  }
}
