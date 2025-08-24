import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { config } from '../config';

export class MetricsService {
  private requestCounter: Counter<string>;
  private requestDuration: Histogram<string>;
  private activeSessions: Gauge<string>;
  private queueSize: Gauge<string>;
  private errorCounter: Counter<string>;
  private static initialized = false;

  constructor() {
    // Clear any existing metrics to prevent conflicts
    register.clear();
    
    // Enable default metrics collection
    collectDefaultMetrics();

    // Custom metrics
    this.requestCounter = new Counter({
      name: 'browserless_requests_total',
      help: 'Total number of requests',
      labelNames: ['method', 'endpoint', 'status_code']
    });

    this.requestDuration = new Histogram({
      name: 'browserless_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.activeSessions = new Gauge({
      name: 'browserless_active_sessions',
      help: 'Number of active browser sessions'
    });

    this.queueSize = new Gauge({
      name: 'browserless_queue_size',
      help: 'Number of jobs in queue'
    });

    this.errorCounter = new Counter({
      name: 'browserless_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'endpoint']
    });
  }

  incrementRequests(method: string, endpoint: string, statusCode: number): void {
    this.requestCounter.inc({ method, endpoint, status_code: statusCode.toString() });
  }

  observeRequestDuration(method: string, endpoint: string, duration: number): void {
    this.requestDuration.observe({ method, endpoint }, duration);
  }

  setActiveSessions(count: number): void {
    this.activeSessions.set(count);
  }

  setQueueSize(size: number): void {
    this.queueSize.set(size);
  }

  incrementErrors(type: string, endpoint: string): void {
    this.errorCounter.inc({ type, endpoint });
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }

  static clearRegistry(): void {
    register.clear();
    MetricsService.initialized = false;
  }
}
