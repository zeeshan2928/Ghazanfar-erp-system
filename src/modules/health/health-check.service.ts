import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppLoggerService } from '../../common/logging/logger.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      heapUsed: number;
      heapTotal: number;
      rss: number;
      percentage: number;
    };
  };
}

export interface ReadinessStatus {
  ready: boolean;
  checks: {
    database: boolean;
    memory: boolean;
  };
}

export interface LivenessStatus {
  alive: boolean;
  uptime: number;
}

export interface Metrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
}

@Injectable()
export class HealthCheckService {
  private startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private logger: AppLoggerService,
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    try {
      // Check database
      const dbStartTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStartTime;

      // Check memory
      const memUsage = process.memoryUsage();
      const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      const isHealthy = dbResponseTime < 5000 && heapPercentage < 90;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp,
        uptime,
        checks: {
          database: {
            status: 'healthy',
            responseTime: dbResponseTime,
          },
          memory: {
            status: heapPercentage < 90 ? 'healthy' : 'unhealthy',
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            rss: memUsage.rss,
            percentage: heapPercentage,
          },
        },
      };
    } catch (error) {
      this.logger.error('Health check failed', error.message, 'HealthCheck');

      const memUsage = process.memoryUsage();
      return {
        status: 'unhealthy',
        timestamp,
        uptime,
        checks: {
          database: {
            status: 'unhealthy',
            error: error.message,
          },
          memory: {
            status: 'unhealthy',
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            rss: memUsage.rss,
            percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
          },
        },
      };
    }
  }

  async checkReadiness(): Promise<ReadinessStatus> {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      // Check memory usage
      const memUsage = process.memoryUsage();
      const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      const ready = heapPercentage < 90;

      return {
        ready,
        checks: {
          database: true,
          memory: heapPercentage < 90,
        },
      };
    } catch (error) {
      this.logger.warn('Readiness check failed', 'HealthCheck');
      return {
        ready: false,
        checks: {
          database: false,
          memory: false,
        },
      };
    }
  }

  checkLiveness(): LivenessStatus {
    return {
      alive: true,
      uptime: Date.now() - this.startTime,
    };
  }

  getMetrics(): Metrics {
    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }
}
