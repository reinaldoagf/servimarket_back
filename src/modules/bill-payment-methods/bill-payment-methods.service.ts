import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBillPaymentMethodDto } from './dto/create-bill-payment-method.dto';
import { UpdateBillPaymentMethodDto } from './dto/update-bill-payment-method.dto';

@Injectable()
export class BillPaymentMethodsService {
  constructor(private readonly service: PrismaService) {}

  async create(dto: CreateBillPaymentMethodDto) {
    // Validar nombre único
    const exists = await this.service.billPaymentMethod.findUnique({
      where: { name: dto.name },
    });

    if (exists) throw new BadRequestException('Payment Method name already exists.');

    return this.service.billPaymentMethod.create({
      data: {
        name: dto.name,
        image: dto.image ?? null,
        country: dto.country ?? null,
        currencyId: dto.currencyId ?? null,
      },
      include: { currency: true },
    });
  }

  async getByFilters(
    obtainCommonElements: number = 0,
    country: string = '',
  ) {
    let where: Prisma.BillPaymentMethodWhereInput = {};

    // 🔹 Caso 1: obtainCommonElements == 1  → obtener los que coincidan con país o tengan country = null
    if (obtainCommonElements === 1) {
      if (country.length) {
        where = {
          OR: [
            { country: country },
            { country: null },
          ],
        };
      } else {
        // Si no se envió country, simplemente filtrar por country null
        where = { country: null };
      }
    }

    // 🔹 Caso 2: obtainCommonElements == 0 → obtener solo los del país
    else {
      if (country.length) {
        where = { country };
      } else {
        // Si country == '' y obtainCommonElements == 0 → obtener todos
        where = {};
      }
    }

    return this.service.billPaymentMethod.findMany({
      where,
      include: { currency: true },
      orderBy: { createdAt: 'desc' },
    });
  }


  async findOne(id: string) {
    const item = await this.service.billPaymentMethod.findUnique({
      where: { id },
      include: { currency: true },
    });

    if (!item) throw new NotFoundException('Payment Method not found');

    return item;
  }

  async update(id: string, dto: UpdateBillPaymentMethodDto) {
    const exists = await this.service.billPaymentMethod.findUnique({ where: { id } });

    if (!exists) throw new NotFoundException('Payment Method not found');

    return this.service.billPaymentMethod.update({
      where: { id },
      data: {
        name: dto.name ?? exists.name,
        image: dto.image ?? exists.image,
        country: dto.country ?? exists.country,
        currencyId: dto.currencyId ?? exists.currencyId,
      },
      include: { currency: true },
    });
  }

  async remove(id: string) {
    const exists = await this.service.billPaymentMethod.findUnique({ where: { id } });

    if (!exists) throw new NotFoundException('Payment Method not found');

    await this.service.billPaymentMethod.delete({ where: { id } });

    return { message: 'Payment method deleted successfully.' };
  }
}
