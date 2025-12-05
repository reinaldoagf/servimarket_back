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
  Put,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CreateBusinessBranchPurchaseDto } from './dto/create-business-branch-purchase.dto';
import { PaginatedBusinessBranchPurchaseResponseDto } from './dto/paginated-business-branch-purchase-response.dto';
import { BusinessBranchPurchaseService } from './business-branch-purchase.service';
import { UpdateBusinessBranchPurchaseDto } from './dto/update-business-branch-purchase.dto';
import { PatchBusinessBranchPurchaseDto } from './dto/patch-business-branch-purchase.dto';
import { ApprovePurchaseDto } from './dto/approve-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('business-branch-purchase')
export class BusinessBranchPurchaseController {
  constructor(private readonly service: BusinessBranchPurchaseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBusinessBranchPurchaseDto) {
    return this.service.create(dto);
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
  @Get('search-pendings')
  @UseGuards(JwtAuthGuard)
  async searchPendings(
    @Req() req: any,
    @Query('branchId') branchId: string = '',
    @Query('search') search: string = '') {
    return this.service.searchPendings(req.user.sub, branchId, search);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  getByFilters(
    @Query('userId') userId: string = '',
    @Query('branchId') branchId: string = '',
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('search') search = '',
    @Query('status') status = '',
    @Query('dateKey') dateKey = 'createdAt',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedBusinessBranchPurchaseResponseDto> {
    return this.service.getByFilters(
      userId,
      branchId,
      +page,
      +pageSize,
      search,
      status,
      dateKey,
      startDate,
      endDate,
    );
  }
  @Get('my-last-sale')
  @UseGuards(JwtAuthGuard)
  async myLastSale(@Query('businessId') businessId: string, @Query('branchId') branchId: string) {
    return this.service.myLastSale(businessId, branchId);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async patch(@Param('id') id: string, @Body() dto: PatchBusinessBranchPurchaseDto) {
    return this.service.patch(id, dto);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateBusinessBranchPurchaseDto) {
    return this.service.update(id, dto);
  }
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard)
  async approve(@Req() req: any, @Param('id') id: string, @Body() dto: ApprovePurchaseDto) {
    const requestingUserID = req.user.sub; // viene del payload del JWT
    return this.service.approve(requestingUserID, id, dto.approve);
  }
  @Delete('/delete-purchase-item/:id')
  @UseGuards(JwtAuthGuard)
  async deletePurchaseItem(
    @Param('id') id: string, 
    @Query('cashRegisterId') cashRegisterId: string = '',
    @Query('userId') userId: string = '',
    @Query('clientDNI') clientDNI: string = '',
  ) {
    return this.service.deletePurchaseItem(id, cashRegisterId, userId, clientDNI);
  }
}
