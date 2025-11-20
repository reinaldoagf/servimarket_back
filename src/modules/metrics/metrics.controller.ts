import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('metrics')
export class MetricsController {
  constructor(private service: MetricsService) {}
  @Get('purchases-by-category')
  @UseGuards(JwtAuthGuard)
  async getPurchasesByCategory(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const requestingUserID = req.user.sub; // viene del payload del JWT
    return this.service.getPurchasesByCategory(
      requestingUserID,
      startDate,
      endDate,
    );
  }

  @Get('sales-by-category')
  @UseGuards(JwtAuthGuard)
  async getSalesByCategory(
    @Query('businessId') businessId: string = '',
    @Query('branchId') branchId: string = '',
    @Query('userId') userId: string = '',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getSalesByCategory(
      businessId,
      branchId,
      userId,
      startDate,
      endDate,
    );
  }
  @Get('investments-by-category')
  @UseGuards(JwtAuthGuard)
  async getInvestmentsByCategory(
    @Query('businessId') businessId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.getInvestmentsByCategory(
      businessId ? businessId : '',
      branchId ? branchId : '',
    );
  }
}
