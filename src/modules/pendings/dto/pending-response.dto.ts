// dto/pending-response.dto.ts
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class PendingResponseDto {
  id: string;
  title: string;
  message: string;
  createdBy: UserResponseDto | null;
  linkedUser: UserResponseDto | null;
  eventDate: Date | null;
  branch: {
    id: string;
    country: string;
    state: string;
    city: string;
    address: string;
  } | null;
  createdAt: Date;
}
