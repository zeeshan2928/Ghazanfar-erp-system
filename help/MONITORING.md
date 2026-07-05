# Monitoring & Logging Guide

Complete guide to monitoring, logging, and observability for the ERP system.

## Table of Contents

1. [Logging Setup](#logging-setup)
2. [Health Checks](#health-checks)
3. [Metrics](#metrics)
4. [Error Tracking](#error-tracking)
5. [Performance Monitoring](#performance-monitoring)
6. [Log Aggregation](#log-aggregation)
7. [Alerting](#alerting)
8. [Dashboards](#dashboards)

---

## Logging Setup

### Logger Service

The application uses Winston for structured logging.

**Configuration:**
```typescript
// src/common/logging/logger.service.ts
import * as winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});
```

### Log Levels

```
error    - Application errors (500 errors, exceptions)
warn     - Warning conditions
info     - General informational messages
debug    - Debug information
verbose  - Detailed debugging
```

### Setting Log Level

**Environment Variable:**
```bash
LOG_LEVEL=debug  # development
LOG_LEVEL=info   # staging
LOG_LEVEL=warn   # production
```

### Usage

**In Controllers/Services:**
```typescript
import { AppLoggerService } from '../../common/logging/logger.service';

export class MyService {
  constructor(private logger: AppLoggerService) {}

  async doSomething() {
    try {
      this.logger.log('Starting operation', 'MyService');
      // Do something
      this.logger.log('Operation complete', 'MyService');
    } catch (error) {
      this.logger.error('Operation failed', error.message, 'MyService');
    }
  }
}
```

### Log Output

**Console (Development):**
```
2024-01-15 10:30:45 [info]: HTTP GET /api/users - 200
2024-01-15 10:30:46 [info]: Starting operation [MyService]
```

**File (logs/combined.log):**
```json
{"level":"info","message":"HTTP GET /api/users - 200","timestamp":"2024-01-15T10:30:45.000Z","service":"erp-backend"}
{"level":"error","message":"Database connection failed","timestamp":"2024-01-15T10:30:46.000Z","service":"erp-backend","context":"MyService"}
```

### Log Files

```
logs/
├── error.log      - Error-level logs only
├── combined.log   - All logs
└── access.log     - HTTP request logs (if configured)
```

**Rotate Logs:**
```bash
# Install logrotate
sudo apt-get install logrotate

# Create config
sudo cat > /etc/logrotate.d/erp << EOF
/path/to/logs/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 644 nobody nobody
  sharedscripts
  postrotate
    systemctl reload erp > /dev/null 2>&1 || true
  endscript
}
EOF
```

---

## Health Checks

### Health Check Endpoint

```
GET /health
GET /health/ready
GET /health/live
GET /health/metrics
```

### Response Format

```json
GET /health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.000Z",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "memory": {
      "status": "healthy",
      "heapUsed": 104857600,
      "heapTotal": 209715200,
      "percentage": 50
    }
  }
}
```

### Kubernetes Health Probes

**liveness** - Is the container alive?
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

**readiness** - Is the container ready to serve?
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Check Health Manually

```bash
# Overall health
curl http://localhost:3000/health | jq

# Readiness
curl http://localhost:3000/health/ready | jq

# Liveness
curl http://localhost:3000/health/live | jq

# Metrics
curl http://localhost:3000/health/metrics | jq
```

---

## Metrics

### Application Metrics

Track custom metrics:

```typescript
import { MetricsService } from '../../common/metrics/metrics.service';

export class MyService {
  constructor(private metrics: MetricsService) {}

  async processOrder(order: Order) {
    // HTTP metrics
    this.metrics.incrementHttpRequests('POST', '/orders', 200);
    
    // Database metrics
    this.metrics.incrementDatabaseQueries('INSERT', 'Order');
    this.metrics.recordDatabaseDuration('INSERT', 'Order', 42);
    
    // Cache metrics
    this.metrics.recordCacheHit('user:123');
    this.metrics.recordCacheMiss('user:456');
    
    // Custom metrics
    this.metrics.incrementCounter('orders_processed');
    this.metrics.recordHistogram('order_processing_time', 1234);
  }
}
```

### Metrics Endpoint

```
GET /metrics                - JSON format
GET /metrics/prometheus     - Prometheus text format
DELETE /metrics             - Reset all metrics
```

### Prometheus Format

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/users",status="200"} 42

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",le="0.1"} 10
http_request_duration_seconds_bucket{method="GET",le="0.5"} 35
http_request_duration_seconds_bucket{method="GET",le="1"} 40
http_request_duration_seconds_bucket{method="GET",le="+Inf"} 42
```

### Export Metrics

```bash
# Export to Prometheus
curl http://localhost:3000/metrics/prometheus > metrics.txt

# Parse with Prometheus
curl http://localhost:3000/metrics/prometheus | promtool check metrics

# View specific metric
curl http://localhost:3000/metrics | jq '.counters'
```

---

## Error Tracking

### Sentry Integration

Sentry tracks errors and exceptions.

**Setup:**
```typescript
// src/main.ts
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}
```

**Configure:**
```env
SENTRY_DSN=https://key@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

**Manual Error Reporting:**
```typescript
import * as Sentry from '@sentry/nestjs';

try {
  // Do something
} catch (error) {
  Sentry.captureException(error);
  this.logger.error('Error occurred', error.message);
}
```

### Error Context

```typescript
// Add user context
Sentry.setUser({
  id: user.id,
  email: user.email,
});

// Add custom tags
Sentry.setTag('component', 'OrderService');

// Add breadcrumbs
Sentry.addBreadcrumb({
  message: 'Order processing started',
  level: 'info',
  data: { orderId: order.id },
});
```

### View Errors

1. Go to https://sentry.io
2. Select project
3. View Issues tab
4. Click on error to see details, stack trace, context

---

## Performance Monitoring

### Application Performance Monitoring (APM)

Sentry includes APM (application performance monitoring).

**Enable:**
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // Sample 10% of transactions
});
```

**Trace Operations:**
```typescript
import * as Sentry from '@sentry/nestjs';

async processOrder(order) {
  const transaction = Sentry.startTransaction({
    op: 'order.process',
    name: 'Process Order',
  });

  try {
    const childSpan = transaction.startChild({
      op: 'db.query',
      description: 'Save order to database',
    });

    await this.orderRepository.save(order);
    childSpan.finish();

    transaction.finish();
  } catch (error) {
    transaction.setStatus('error');
    transaction.finish();
    throw error;
  }
}
```

### Query Performance

**Slow Query Logging:**
```typescript
// Enable in database config
const slowQueryThreshold = 1000; // 1 second

database.on('query', (query, duration) => {
  if (duration > slowQueryThreshold) {
    logger.warn(`Slow query detected (${duration}ms): ${query}`);
  }
});
```

**Analyze Performance:**
```bash
# Run performance benchmarks
npm run perf:load

# Profile CPU
npm run perf:profile:cpu

# Profile memory
npm run perf:profile:mem

# Analyze results
npm run perf:analyze
```

---

## Log Aggregation

### Using ELK Stack (Elasticsearch, Logstash, Kibana)

**Docker Compose:**
```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
```

**Send Logs to Elasticsearch:**
```typescript
import * as Elasticsearch from '@nestjs/elasticsearch';

// Install: npm install @nestjs/elasticsearch @elastic/elasticsearch

@Module({
  imports: [
    ElasticsearchModule.register({
      node: 'http://localhost:9200',
    }),
  ],
})
export class LogModule {}
```

### Using CloudWatch (AWS)

```bash
npm install aws-sdk winston-cloudwatch
```

**Configure:**
```typescript
import WinstonCloudWatch from 'winston-cloudwatch';

const logger = winston.createLogger({
  transports: [
    new WinstonCloudWatch({
      logGroupName: '/aws/erp/backend',
      logStreamName: 'production',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,
    }),
  ],
});
```

### View Aggregated Logs

**Kibana (localhost:5601):**
1. Create index pattern `erp-*`
2. Go to Discover
3. View logs with filters and search

**CloudWatch (AWS Console):**
1. Go to CloudWatch > Log groups
2. Select `/aws/erp/backend`
3. View and search logs

---

## Alerting

### Email Alerts

```typescript
import { EmailService } from '../../modules/email/email.service';

export class AlertService {
  constructor(private emailService: EmailService) {}

  async alertOnHighErrorRate() {
    const errorRate = await this.getErrorRate();
    
    if (errorRate > 0.05) {  // 5% error rate
      await this.emailService.send({
        to: 'ops@example.com',
        subject: 'High error rate detected',
        template: 'alert-error-rate',
        context: { errorRate },
      });
    }
  }
}
```

### Slack Alerts

```typescript
import { SlackService } from '../../modules/slack/slack.service';

export class AlertService {
  constructor(private slack: SlackService) {}

  async notifySlack(message: string) {
    await this.slack.send({
      channel: '#alerts',
      text: message,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: 'Environment', value: process.env.NODE_ENV },
            { title: 'Timestamp', value: new Date().toISOString() },
          ],
        },
      ],
    });
  }
}
```

### Sentry Alerts

Configure in Sentry dashboard:
1. Go to Alerts > Create Alert Rule
2. Set conditions (e.g., "Error rate > 5%")
3. Set actions (email, Slack, webhook)

### Prometheus Alerts

```yaml
# prometheus.yml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alert_rules.yml'
```

**Alert Rules (alert_rules.yml):**
```yaml
groups:
  - name: erp
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 500000000
        for: 5m
        labels:
          severity: warning
```

---

## Dashboards

### Grafana Dashboards

**Install Grafana:**
```bash
docker run -d -p 3000:3000 grafana/grafana:latest
```

**Add Data Source:**
1. Go to Configuration > Data Sources
2. Add Prometheus: `http://prometheus:9090`
3. Save

**Create Dashboard:**
1. Click + > Dashboard
2. Add panels with metrics:
   - `rate(http_requests_total[5m])`
   - `http_request_duration_seconds_bucket`
   - `process_resident_memory_bytes`

### Sample Metrics to Track

```
Backend:
- Request rate (requests/sec)
- Error rate (errors/sec)
- Response time (p50, p95, p99)
- Database query time
- Cache hit rate
- Memory usage
- CPU usage

Frontend:
- Page load time
- JS errors
- API call latency
- Cache hit rate

Database:
- Connection count
- Query execution time
- Slow queries
- Replication lag (if applicable)

Infrastructure:
- Disk usage
- Network bandwidth
- Container restarts
- Deployment status
```

---

## Best Practices

1. **Use structured logging** - JSON format for easy parsing
2. **Include request ID** - For tracing through the system
3. **Log at appropriate levels** - Not everything should be info level
4. **Avoid logging sensitive data** - No passwords, API keys, PII
5. **Use context** - Include relevant metadata with logs
6. **Set up alerting** - Know when things go wrong
7. **Monitor key metrics** - Response time, error rate, throughput
8. **Correlate logs and traces** - Link related events
9. **Archive old logs** - Don't store forever
10. **Test alerting** - Verify alerts work before production

---

## Troubleshooting

### Logs Not Appearing

```bash
# Check log level
echo $LOG_LEVEL

# Check log file permissions
ls -la logs/

# Verify logger initialization
# Check if LoggerMiddleware is registered
```

### High Memory Usage

```bash
# Check heap size
node --expose-gc -e "console.log(require('v8').writeHeapSnapshot())"

# Use clinic.js for profiling
clinic doctor -- node dist/main

# Memory profile
npm run perf:profile:mem
```

### Slow Queries

```bash
# Enable query logging
PRISMA_DEBUG=* npm start

# Check database stats
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Run analyzer
npm run perf:analyze
```

### Sentry Not Capturing Errors

1. Verify SENTRY_DSN is set
2. Check network connectivity
3. Verify Sentry project is created
4. Check error level (must be error or higher)
5. View Sentry logs for rejections

---

## Resources

- [Winston Logger](https://github.com/winstonjs/winston)
- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)
- [ELK Stack](https://www.elastic.co/what-is/elk-stack)
- [Clinic.js](https://clinicjs.org/)
