import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  async check() {
    return this.healthCheckService.checkHealth();
  }

  @Get('ready')
  async ready() {
    return this.healthCheckService.checkReadiness();
  }

  @Get('live')
  async live() {
    return this.healthCheckService.checkLiveness();
  }

  @Get('metrics')
  async metrics() {
    return this.healthCheckService.getMetrics();
  }
}
