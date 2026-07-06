import { Controller, Get, Delete } from '@nestjs/common';
import { MetricsService } from '../../common/metrics/metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics() {
    return this.metricsService.getAllMetrics();
  }

  @Get('prometheus')
  getPrometheusMetrics() {
    const metrics = this.metricsService.getAllMetrics();
    let output = '';

    // Output counters
    metrics.counters.forEach(counter => {
      output += `# HELP ${counter.name}\n`;
      output += `# TYPE ${counter.name} counter\n`;
      output += `${counter.name} ${counter.value}\n\n`;
    });

    // Output gauges
    metrics.gauges.forEach(gauge => {
      output += `# HELP ${gauge.name}\n`;
      output += `# TYPE ${gauge.name} gauge\n`;
      output += `${gauge.name} ${gauge.value}\n\n`;
    });

    // Output histograms
    metrics.histograms.forEach((histogram: any) => {
      if (histogram.count) {
        output += `# HELP ${histogram.name}\n`;
        output += `# TYPE ${histogram.name} histogram\n`;
        output += `${histogram.name}_count ${histogram.count}\n`;
        output += `${histogram.name}_sum ${histogram.sum}\n`;
        output += `${histogram.name}_bucket{le="0.1"} ${histogram.count}\n`;
        output += `${histogram.name}_bucket{le="0.5"} ${histogram.count}\n`;
        output += `${histogram.name}_bucket{le="1"} ${histogram.count}\n`;
        output += `${histogram.name}_bucket{le="+Inf"} ${histogram.count}\n\n`;
      }
    });

    return output;
  }

  @Delete()
  resetMetrics() {
    this.metricsService.reset();
    return { message: 'Metrics reset successfully' };
  }
}
