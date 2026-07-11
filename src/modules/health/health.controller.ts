import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { Public } from '@common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Public()
  @Get()
  async check() {
    const { status, timestamp } = await this.healthCheckService.checkHealth();
    return { status, timestamp };
  }

  @Public()
  @Get('ready')
  async ready() {
    return this.healthCheckService.checkReadiness();
  }

  @Public()
  @Get('live')
  async live() {
    return this.healthCheckService.checkLiveness();
  }

  @UseGuards(JwtGuard)
  @Get('detailed')
  async detailed() {
    return this.healthCheckService.checkHealth();
  }

  @UseGuards(JwtGuard)
  @Get('metrics')
  async metrics() {
    return this.healthCheckService.getMetrics();
  }
}
