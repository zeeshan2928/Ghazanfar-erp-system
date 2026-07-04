import { Injectable } from '@nestjs/common';

interface Counter {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

interface Gauge {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

interface Histogram {
  name: string;
  values: number[];
  labels?: Record<string, string>;
}

@Injectable()
export class MetricsService {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  // HTTP Metrics
  incrementHttpRequests(method: string, route: string, statusCode: number): void {
    const key = `http_requests_total{method="${method}",route="${route}",status="${statusCode}"}`;
    this.incrementCounter(key);
  }

  recordHttpDuration(method: string, route: string, duration: number): void {
    const key = `http_request_duration_seconds{method="${method}",route="${route}"}`;
    this.recordHistogram(key, duration / 1000); // Convert to seconds
  }

  // Database Metrics
  incrementDatabaseQueries(operation: string, table: string): void {
    const key = `database_queries_total{operation="${operation}",table="${table}"}`;
    this.incrementCounter(key);
  }

  recordDatabaseDuration(operation: string, table: string, duration: number): void {
    const key = `database_query_duration_seconds{operation="${operation}",table="${table}"}`;
    this.recordHistogram(key, duration / 1000); // Convert to seconds
  }

  // Cache Metrics
  recordCacheHit(key: string): void {
    const metricKey = `cache_hits_total{key="${key}"}`;
    this.incrementCounter(metricKey);
  }

  recordCacheMiss(key: string): void {
    const metricKey = `cache_misses_total{key="${key}"}`;
    this.incrementCounter(metricKey);
  }

  // Generic Counter Operations
  incrementCounter(key: string, value: number = 1): void {
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  getCounter(key: string): number {
    return this.counters.get(key) || 0;
  }

  // Generic Gauge Operations
  setGauge(key: string, value: number): void {
    this.gauges.set(key, value);
  }

  getGauge(key: string): number {
    return this.gauges.get(key) || 0;
  }

  // Generic Histogram Operations
  recordHistogram(key: string, value: number): void {
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  getHistogram(key: string): number[] {
    return this.histograms.get(key) || [];
  }

  getHistogramStats(key: string) {
    const values = this.getHistogram(key);
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = sorted[0];
    const max = sorted[values.length - 1];
    const p50 = sorted[Math.floor(values.length * 0.5)];
    const p95 = sorted[Math.floor(values.length * 0.95)];
    const p99 = sorted[Math.floor(values.length * 0.99)];

    return {
      count: values.length,
      sum,
      avg,
      min,
      max,
      p50,
      p95,
      p99,
    };
  }

  // Get all metrics
  getAllMetrics() {
    return {
      counters: Array.from(this.counters.entries()).map(([name, value]) => ({
        name,
        value,
      })),
      gauges: Array.from(this.gauges.entries()).map(([name, value]) => ({
        name,
        value,
      })),
      histograms: Array.from(this.histograms.entries()).map(([name, values]) => ({
        name,
        ...this.getHistogramStats(name),
      })),
    };
  }

  // Reset metrics
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}
