import {
  Controller,
  Get,
  Query,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BillPaymentMethodsService } from './bill-payment-methods.service';
import { CreateBillPaymentMethodDto } from './dto/create-bill-payment-method.dto';
import { UpdateBillPaymentMethodDto } from './dto/update-bill-payment-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bill-payment-methods')
export class BillPaymentMethodsController {
  constructor(private readonly service: BillPaymentMethodsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() body: CreateBillPaymentMethodDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create({
      ...body,
      image: file?.filename ?? body.image ?? null,
    });
  }

  @Get()
  async getByFilters(
    @Query('obtainCommonElements') obtainCommonElements: string = '0',
    @Query('country') country: string = '',
  ) {
    return this.service.getByFilters(
      Number(obtainCommonElements),
      country,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body() body: UpdateBillPaymentMethodDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(id, {
      ...body,
      image: file?.filename ?? body.image ?? undefined,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
