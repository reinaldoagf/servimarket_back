// dto/client-response.dto.ts
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class ClientResponseDto {
  id: string;
  user: UserResponseDto | null;
  clientName: string | null;
  clientDNI: string | null;
  branch: {
    id: string;
    country: string;
    state: string;
    city: string;
    address: string;
  };
  createdAt: Date;
}
