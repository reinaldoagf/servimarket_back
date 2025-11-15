import { Injectable } from '@nestjs/common';
import { MetricsGateway } from './metrics.gateway';

@Injectable()
export class MetricsWsService {
  constructor(private readonly gateway: MetricsGateway) {}

  emitPurchaseToUser(userId: string, data: any) {
    this.gateway.sendPurchaseCreated(userId, data);
  }
}
