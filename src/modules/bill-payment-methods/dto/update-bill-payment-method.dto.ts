import { PartialType } from '@nestjs/mapped-types';
import { CreateBillPaymentMethodDto } from './create-bill-payment-method.dto';

export class UpdateBillPaymentMethodDto extends PartialType(CreateBillPaymentMethodDto) {}
