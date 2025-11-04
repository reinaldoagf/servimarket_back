// src/business-branch-purchase/business-branch-purchase.controller.ts
import {
  Controller,
  Get,
  Query,
  Post,
  Req,
  Body,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CreateBusinessBranchPurchaseDto } from './dto/create-business-branch-purchase.dto';
import { PaginatedBusinessBranchPurchaseResponseDto } from './dto/paginated-business-branch-purchase-response.dto';
import { BusinessBranchPurchaseService } from './business-branch-purchase.service';
import { UpdateBusinessBranchPurchaseDto } from './dto/update-business-branch-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('business-branch-purchase')
export class BusinessBranchPurchaseController {
  constructor(private readonly service: BusinessBranchPurchaseService) {}

  /* @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateBusinessBranchPurchaseDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getByFilters(
    @Query('cashRegisterId') cashRegisterId: string = '',
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('search') search = '',
    @Query('status') status = '',
    @Query('dateKey') dateKey = 'createdAt',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedBusinessBranchPurchaseResponseDto> {
    return this.service.getByFilters(
      cashRegisterId,
      +page,
      +pageSize,
      search,
      status,
      dateKey,
      startDate,
      endDate,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.deleteById(id);
  }
  // 📊 Obtener resumen de compras por usuario
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getPurchaseSummary(
    @Query('businessId') businessId: string,
    @Query('branchId') branchId: string,
    @Query('userId') userId: string,
  ) {
    return this.service.getPurchaseSummaryByFilters(businessId, branchId, userId);
  }
  @Get('my-last-purchase')
  @UseGuards(JwtAuthGuard)
  async myLastPurchase(@Req() req: any) {
    return this.service.myLastPurchase(req.user.sub);
  }
  @Get('my-last-sale')
  @UseGuards(JwtAuthGuard)
  async myLastSale(@Query('businessId') businessId: string, @Query('branchId') branchId: string) {
    return this.service.myLastSale(businessId, branchId);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateBusinessBranchPurchaseDto) {
    return this.service.update(id, dto);
  } */
}
