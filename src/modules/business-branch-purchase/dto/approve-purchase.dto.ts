import { IsBoolean } from 'class-validator';

export class ApprovePurchaseDto {
  @IsBoolean()
  approve: boolean;
}
