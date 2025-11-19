import { IsBoolean } from 'class-validator';

export class UpdateBranchAvailabilityDto {
  @IsBoolean()
  itsOpen: boolean;
}
