import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

// Health nằm ngoài prefix /api/v1 (System_Overview §10), không bọc envelope.
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live() {
    return this.healthService.liveness();
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.readiness();
    if (result.status !== 'UP') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
