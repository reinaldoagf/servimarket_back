// metrics-ws.module.ts
import { Module } from '@nestjs/common';
import { MetricsWsService } from './metrics-ws.service';
import { MetricsGateway } from './metrics.gateway';

@Module({
  providers: [MetricsGateway, MetricsWsService],
  exports: [MetricsWsService],
})
export class MetricsWsModule {}
