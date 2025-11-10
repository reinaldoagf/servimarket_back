import { Controller, Get, Query, Put, Param, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingResponseDto } from './dto/setting-response.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get()
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('key') key?: string,
    @Query('userId') userId?: string,
    @Query('businessId') businessId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<SettingResponseDto[]> {
    return this.service.getByFilters(key, userId, businessId, branchId);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateSettingDto) {
    return this.service.updateSetting(id, dto);
  }
}
