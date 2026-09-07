import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../config/app-config';
import { RequestContext } from '../../common/http/request-context';

export interface LivenessResult {
  status: 'UP';
  service: string;
  time: string;
}

export interface ReadinessResult {
  status: 'UP' | 'DEGRADED';
  service: string;
  checks: { config: string; mysql: string };
  trace_id: string | null;
  time: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: AppConfigService,
  ) {}

  liveness(): LivenessResult {
    return {
      status: 'UP',
      service: this.config.config.serviceName,
      time: new Date().toISOString(),
    };
  }

  // Readiness kiểm MySQL (dependency bắt buộc). Kafka/SMTP self-report qua log/metric (v1).
  async readiness(): Promise<ReadinessResult> {
    let mysql = 'UP';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      mysql = 'DOWN';
    }

    return {
      status: mysql === 'UP' ? 'UP' : 'DEGRADED',
      service: this.config.config.serviceName,
      checks: { config: 'UP', mysql },
      trace_id: RequestContext.getTraceId() ?? RequestContext.getRequestId() ?? null,
      time: new Date().toISOString(),
    };
  }
}
