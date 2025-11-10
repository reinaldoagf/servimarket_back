// settings.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SettingResponseDto } from './dto/setting-response.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

const SELECT_FIELDS = {
  id: true,
  key: true,
  floatValue: true,
  stringValue: true,
  userId: true,
  user: true,
  businessId: true,
  business: true,
  branchId: true,
  branch: true,
  createdAt: true,
};

@Injectable()
export class SettingsService {
  constructor(private service: PrismaService) {}

  async getByFilters(
    key?: string | null,
    userId?: string | null,
    businessId?: string | null,
    branchId?: string | null,
  ): Promise<SettingResponseDto[]> {
    const where: Prisma.SettingWhereInput = {};

    if (key) where.key = key;
    if (userId) where.userId = userId;
    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;

    const settings = await this.service.setting.findMany({
      where,
      select: SELECT_FIELDS,
    });

    return settings;
  }

  async updateSetting(id: string, dto: UpdateSettingDto) {
    try {
      const setting = await this.service.setting.update({
        where: { id },
        data: {
          key: dto.key,
          floatValue: dto.floatValue,
          stringValue: dto.stringValue,
        },
      });
      return setting;
    } catch (err: any) {
      throw new BadRequestException(`Error updating setting: ${err.message}`);
    }
  }
}
