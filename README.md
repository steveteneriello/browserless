# Bulletproof Browserless Production Environment

A production-ready, highly resilient browserless production environment designed for scalable web automation, screenshot generation, and PDF creation. Built with comprehensive safeguards, monitoring, and failover mechanisms to ensure maximum uptime and reliability.

## 🚀 Features

### Core Capabilities
- **Screenshot Generation**: High-quality screenshots with customizable options
- **PDF Generation**: Full-page PDF creation with various formatting options
- **Web Scraping**: Intelligent content extraction with CSS selectors
- **JavaScript Evaluation**: Safe code execution in isolated browser contexts

### Production-Ready Infrastructure
- **Load Balancing**: Multiple browserless instances with intelligent routing
- **Circuit Breakers**: Automatic failure detection and recovery
- **Memory Management**: Advanced memory monitoring and garbage collection
- **Health Monitoring**: Comprehensive health checks and metrics
- **Auto-scaling**: Dynamic scaling based on load and performance
- **Rate Limiting**: Request throttling to prevent abuse
- **Security**: Content filtering, sandboxing, and API key authentication

### Monitoring & Observability
- **Prometheus Metrics**: Detailed performance and health metrics
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Health Endpoints**: Multiple health check endpoints for monitoring
- **Performance Tracking**: Request duration, memory usage, and error rates

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [API Documentation](#api-documentation)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Redis (for queue management)
- Docker (optional)

### Local Development

1. **Clone and Install**
```bash
git clone <repository-url>
cd browserless
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Redis** (using Docker)
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

4. **Run Development Server**
```bash
npm run dev
```

5. **Test the API**
```bash
curl -X POST http://localhost:3000/api/browser/screenshot 
  -H "Content-Type: application/json" 
  -H "x-api-key: your-secret-api-key" 
  -d '{"url": "https://example.com"}' 
  --output screenshot.png
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t browserless-app .
docker run -p 3000:3000 -e API_KEY=your-secret-key browserless-app
```

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway up
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browserless API                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐ │
│  │  Express API    │    │ Browser Pool    │    │ Load Balancer │ │
│  │  - Rate Limiting│───▶│ - Session Mgmt  │───▶│ - Multi-Inst  │ │
│  │  - Auth & CORS  │    │ - Circuit Break │    │ - Health Check│ │
│  │  - Health       │    │ - Memory Mgmt   │    │ - Failover    │ │
│  └─────────────────┘    └─────────────────┘    └───────────────┘ │
│                                  │                               │
└──────────────────────────────────┼───────────────────────────────┘
                                   │
                ┌──────────────────▼──────────────────┐
                │        Queue Service                │
                │  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
                │  │ Redis   │ │ Bull    │ │ Metrics │ │
                │  │ Queue   │ │ Processor│ │ Service │ │
                │  └─────────┘ └─────────┘ └─────────┘ │
                └─────────────────────────────────────────┘
```

### Key Components

- **Browser Pool**: Manages browser instances with lifecycle control
- **Load Balancer**: Routes requests across multiple browserless services
- **Circuit Breaker**: Prevents cascade failures
- **Memory Manager**: Monitors and controls memory usage
- **Queue Service**: Handles background job processing
- **Metrics Service**: Collects and exposes performance metrics

## 📚 API Documentation

### Authentication
All API endpoints require an API key passed in the `x-api-key` header.

### Endpoints

#### Screenshot Generation
```http
POST /api/browser/screenshot
Content-Type: application/json
x-api-key: your-api-key

{
  "url": "https://example.com",
  "options": {
    "width": 1920,
    "height": 1080,
    "fullPage": false,
    "format": "png",
    "quality": 90,
    "waitFor": 1000
  }
}
```

**Response**: Binary image data

#### PDF Generation
```http
POST /api/browser/pdf
Content-Type: application/json
x-api-key: your-api-key

{
  "url": "https://example.com",
  "options": {
    "format": "A4",
    "landscape": false,
    "printBackground": true
  }
}
```

**Response**: Binary PDF data

#### Web Scraping
```http
POST /api/browser/scrape
Content-Type: application/json
x-api-key: your-api-key

{
  "url": "https://example.com",
  "options": {
    "selector": "h1, p",
    "waitFor": 2000
  }
}
```

**Response**: 
```json
{
  "status": "success",
  "data": [
    {
      "text": "Example Title",
      "html": "<h1>Example Title</h1>",
      "attributes": {}
    }
  ],
  "executionTime": 1234,
  "url": "https://example.com"
}
```

#### JavaScript Evaluation
```http
POST /api/browser/evaluate
Content-Type: application/json
x-api-key: your-api-key

{
  "code": "document.title",
  "url": "https://example.com"
}
```

#### Health & Status
```http
GET /health
GET /health/ready
GET /health/live
GET /api/browser/status
GET /metrics
```

## ⚙️ Configuration

### Environment Variables

#### Core Settings
```bash
# Server
NODE_ENV=production
PORT=3000

# Security
API_KEY=your-secret-api-key
CORS_ORIGIN=* 

# Browser Configuration
BROWSER_TIMEOUT=30000
MAX_CONCURRENT_SESSIONS=10
BROWSER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage

# Multiple Browserless Instances
BROWSER_WS_ENDPOINT=wss://chrome.browserless.io?token=TOKEN
BROWSERLESS_1_URL=wss://chrome-1.browserless.io?token=TOKEN1
BROWSERLESS_2_URL=wss://chrome-2.browserless.io?token=TOKEN2
BROWSERLESS_3_URL=wss://chrome-3.browserless.io?token=TOKEN3

# Resource Management
MAX_MEMORY_PER_BROWSER=536870912  # 512MB
MEMORY_WARNING_THRESHOLD=0.8      # 80%
MEMORY_CRITICAL_THRESHOLD=0.9     # 90%

# Queue & Redis
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5
QUEUE_MAX_JOBS=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
HEALTH_CHECK_INTERVAL=30000
```

#### Circuit Breaker Settings
```bash
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=120000
```

#### Memory Management
```bash
GARBAGE_COLLECTION_INTERVAL=30000
BROWSER_RESTART_INTERVAL=3600000
MAX_PAGES_PER_BROWSER=10
PAGE_IDLE_TIMEOUT=60000
BROWSER_IDLE_TIMEOUT=300000
```

### Advanced Configuration

#### Load Balancer Strategy
```bash
LOAD_BALANCER_STRATEGY=health_based  # round_robin, least_connections, weighted, health_based
HEALTH_CHECK_INTERVAL=30000
MAX_RETRIES=3
INSTANCE_TIMEOUT=30000
```

#### Security Settings
```bash
ALLOWED_DOMAINS=*
BLOCKED_DOMAINS=localhost,127.0.0.1,0.0.0.0,::1
MAX_URL_LENGTH=2048
MAX_HTML_SIZE=10485760  # 10MB
```

## 🚀 Deployment

### Railway (Recommended)

1. **Prepare Environment**
```bash
# Create railway.toml (already included)
# Set environment variables in Railway dashboard
```

2. **Deploy**
```bash
railway login
railway up
```

3. **Add Redis**
```bash
railway add redis
```

4. **Configure Environment Variables**
Set the following in Railway dashboard:
- `API_KEY`
- `REDIS_URL` (auto-configured with Redis addon)
- `BROWSER_WS_ENDPOINT` (your browserless service URL)

### Docker

1. **Build Image**
```bash
docker build -t browserless-app .
```

2. **Run with Dependencies**
```bash
docker-compose up -d
```

3. **Scale Services**
```bash
docker-compose up -d --scale browserless=3
```

### Kubernetes

```yaml
# See k8s-deployment.yaml for full configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: browserless-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: browserless-api
  template:
    spec:
      containers:
      - name: browserless-api
        image: browserless-app:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## 📊 Monitoring

### Health Checks

- **Basic Health**: `GET /health`
- **Readiness**: `GET /health/ready`
- **Liveness**: `GET /health/live`
- **Detailed Status**: `GET /api/browser/status`

### Metrics (Prometheus)

Access metrics at `GET /metrics`:

```
# Core Metrics
browserless_requests_total
browserless_request_duration_seconds
browserless_active_sessions
browserless_queue_size
browserless_errors_total

# Memory Metrics
process_memory_usage_bytes
process_memory_heap_bytes

# System Metrics
process_cpu_usage_percent
process_uptime_seconds
```

### Logging

Structured JSON logs with correlation IDs:

```json
{
  "timestamp": "2025-08-20T10:30:00.000Z",
  "level": "info",
  "message": "Screenshot completed",
  "service": "browserless-api",
  "correlationId": "req-123",
  "url": "https://example.com",
  "executionTime": 1234,
  "memoryUsage": 125829120
}
```

### Alerting Rules

Recommended alerts:
- Error rate > 5%
- Response time > 30s
- Memory usage > 90%
- CPU usage > 85%
- Circuit breaker opened
- No healthy instances available

## 🔒 Security

### Authentication
- API key required for all browser operations
- Configurable CORS policies
- Request origin validation

### Content Security
- URL validation and filtering
- Domain blacklisting (localhost, internal IPs)
- Maximum content size limits
- Script execution timeouts

### Sandboxing
- Process isolation with non-root user
- Read-only root filesystem
- Limited system capabilities
- Network restrictions

### Rate Limiting
- Per-IP request limiting
- Sliding window algorithm
- Configurable thresholds
- Automatic blocking

## 🛠️ Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory stats
curl localhost:3000/health

# Monitor metrics
curl localhost:3000/metrics | grep memory

# Adjust memory limits
export MEMORY_WARNING_THRESHOLD=0.7
export GARBAGE_COLLECTION_INTERVAL=15000
```

#### Browser Crashes
```bash
# Check browser pool status
curl localhost:3000/api/browser/status

# Review logs
docker logs <container-id> | grep "browser"

# Adjust browser args
export BROWSER_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--memory-pressure-off"
```

#### Circuit Breaker Issues
```bash
# Check circuit breaker states
curl localhost:3000/api/browser/status

# Reset circuit breakers (restart service)
# Or adjust thresholds
export CIRCUIT_BREAKER_FAILURE_THRESHOLD=10
```

#### Queue Backup
```bash
# Check queue stats
curl localhost:3000/api/browser/status

# Clear queue (Redis)
redis-cli flushdb

# Increase concurrency
export QUEUE_CONCURRENCY=10
```

### Performance Tuning

#### Memory Optimization
```bash
# Reduce memory per browser
export MAX_MEMORY_PER_BROWSER=268435456  # 256MB

# Increase GC frequency
export GARBAGE_COLLECTION_INTERVAL=15000

# Limit browser sessions
export MAX_CONCURRENT_SESSIONS=5
```

#### Response Time Optimization
```bash
# Reduce timeouts
export BROWSER_TIMEOUT=15000
export DEFAULT_TIMEOUT=20000

# Disable images for faster loading
export BROWSER_ARGS="${BROWSER_ARGS},--disable-images"

# Increase browser pool
export MAX_CONCURRENT_SESSIONS=20
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Enable browser inspector
export ENABLE_INSPECTOR=true

# Run browser in non-headless mode (development only)
export BROWSER_HEADLESS=false
```

## 📈 Performance Benchmarks

Expected performance on Railway with 1GB RAM:
- **Screenshots**: 50-100 per minute
- **PDFs**: 30-60 per minute  
- **Scraping**: 100-200 per minute
- **Response Time**: <3s average
- **Memory Usage**: 60-80% under load
- **Error Rate**: <1% under normal conditions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: See `/docs` folder
- **Examples**: See `/examples` folder

---

Built with ❤️ for production reliability and scalability.

A bulletproof, production-ready browserless environment for web scraping, screenshot generation, and browser automation. Built with Node.js, TypeScript, and designed for deployment on Railway with comprehensive safeguards and monitoring.

## 🚀 Features

### Core Capabilities
- **Screenshot Generation**: High-quality PNG/JPEG screenshots with customizable dimensions
- **PDF Generation**: Convert web pages to PDF with various formats and options
- **Web Scraping**: Extract content, metadata, links, and images from web pages
- **JavaScript Execution**: Run custom JavaScript code in browser context

### Production Features
- **Circuit Breaker Pattern**: Automatic failure detection and recovery
- **Memory Management**: Advanced memory monitoring with garbage collection
- **Health Checks**: Comprehensive health monitoring with readiness/liveness probes
- **Rate Limiting**: Configurable request throttling and API protection
- **Queue Management**: Bull queue with Redis for job processing
- **Metrics & Monitoring**: Prometheus metrics for observability
- **Security**: Sandboxing, content filtering, and access controls
- **Auto-scaling Ready**: Designed for horizontal and vertical scaling

### Reliability & Safety
- **Browser Pool Management**: Automatic browser lifecycle management
- **Resource Limits**: Memory, CPU, and timeout protection
- **Error Recovery**: Automatic retry mechanisms and fallback strategies
- **Graceful Degradation**: Service continues operating under partial failures
- **Zero-downtime Deployments**: Health checks ensure smooth deployments

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [API Documentation](#api-documentation)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [Monitoring](#monitoring)
6. [Security](#security)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis (for queue management)
- Docker (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd browserless

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration
nano .env

# Build the application
npm run build

# Start the service
npm start
```

### Docker Quick Start

```bash
# Build and start with Docker Compose
docker-compose up -d

# Or build Docker image
docker build -t browserless-app .
docker run -p 3000:3000 -e API_KEY=your-secret-key browserless-app
```

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway up
```

## 📚 API Documentation

### Authentication
All API endpoints (except health checks) require authentication via API key:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/browser/screenshot
```

### Screenshot API

**POST** `/api/browser/screenshot`

Generate a screenshot of a web page.

```bash
curl -X POST 
  -H "Content-Type: application/json" 
  -H "X-API-Key: your-api-key" 
  -d '{
    "url": "https://example.com",
    "options": {
      "width": 1920,
      "height": 1080,
      "fullPage": true,
      "format": "png",
      "quality": 90
    }
  }' 
  http://localhost:3000/api/browser/screenshot
```

**Parameters:**
- `url` (required): Target URL
- `options.width`: Viewport width (100-4000, default: 1440)
- `options.height`: Viewport height (100-4000, default: 2400)
- `options.fullPage`: Capture full page (default: false)
- `options.format`: Image format - "png" or "jpeg" (default: "png")
- `options.quality`: JPEG quality 1-100 (default: 80)
- `options.waitFor`: Wait time in ms before capture (0-60000)

### PDF Generation API

**POST** `/api/browser/pdf`

Generate a PDF from a web page.

```bash
curl -X POST 
  -H "Content-Type: application/json" 
  -H "X-API-Key: your-api-key" 
  -d '{
    "url": "https://example.com",
    "options": {
      "format": "A4",
      "landscape": false,
      "printBackground": true
    }
  }' 
  http://localhost:3000/api/browser/pdf
```

**Parameters:**
- `url` (required): Target URL
- `options.format`: Page format - "A4", "A3", "Letter", etc. (default: "A4")
- `options.landscape`: Landscape orientation (default: false)
- `options.printBackground`: Include background graphics (default: true)

### Web Scraping API

**POST** `/api/browser/scrape`

Extract content and metadata from a web page.

```bash
curl -X POST 
  -H "Content-Type: application/json" 
  -H "X-API-Key: your-api-key" 
  -d '{
    "url": "https://example.com",
    "options": {
      "selector": "h1, h2, p",
      "waitFor": 2000
    }
  }' 
  http://localhost:3000/api/browser/scrape
```

**Parameters:**
- `url` (required): Target URL
- `options.selector`: CSS selector for specific elements
- `options.waitFor`: Wait time before scraping (0-60000ms)

### JavaScript Execution API

**POST** `/api/browser/evaluate`

Execute custom JavaScript in browser context.

```bash
curl -X POST 
  -H "Content-Type: application/json" 
  -H "X-API-Key: your-api-key" 
  -d '{
    "code": "document.title",
    "url": "https://example.com"
  }' 
  http://localhost:3000/api/browser/evaluate
```

**Parameters:**
- `code` (required): JavaScript code to execute
- `url`: Optional URL to navigate to first

### Service Status API

**GET** `/api/browser/status`

Get service health and statistics.

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/browser/status
```

### Health Check APIs

**GET** `/health` - Basic health check (no authentication required)
**GET** `/health/ready` - Readiness probe
**GET** `/health/live` - Liveness probe

### Metrics API

**GET** `/metrics` - Prometheus metrics (no authentication required)

## ⚙️ Configuration

### Environment Variables

#### Core Settings
```bash
NODE_ENV=production
PORT=3000
API_KEY=your-secret-api-key-here
```

#### Browser Configuration
```bash
BROWSER_TIMEOUT=80000               # 80 seconds
MAX_CONCURRENT_SESSIONS=10          # Maximum browser sessions
MAX_JOBS_PER_BROWSER=10            # Jobs per browser instance
BROWSER_IDLE_TIMEOUT=300000        # 5 minutes browser idle timeout
```

#### Memory Management
```bash
MAX_MEMORY_PER_BROWSER=536870912   # 512MB per browser
MEMORY_WARNING_THRESHOLD=0.8       # 80% memory warning
MEMORY_CRITICAL_THRESHOLD=0.9      # 90% critical threshold
GARBAGE_COLLECTION_INTERVAL=30000  # 30 seconds GC interval
```

#### Viewport Configuration
```bash
DEFAULT_WIDTH=1440                  # Default viewport width
DEFAULT_HEIGHT=2400                 # Default viewport height
MAX_VIEWPORT_WIDTH=3840            # Maximum viewport width
MAX_VIEWPORT_HEIGHT=2160           # Maximum viewport height
```

#### Queue & Redis
```bash
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5                # Concurrent job processing
QUEUE_MAX_JOBS=1000               # Maximum queue size
MAX_BATCH_SIZE=10                 # Maximum batch size
MAX_CONCURRENT_REQUESTS=50        # Maximum concurrent requests
```

#### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes window
RATE_LIMIT_MAX_REQUESTS=100       # 100 requests per window
```

#### Security
```bash
CORS_ORIGIN=*                     # CORS allowed origins
ALLOWED_DOMAINS=*                 # Allowed domains (comma-separated)
BLOCKED_DOMAINS=localhost,127.0.0.1  # Blocked domains
```

#### File Handling
```bash
UPLOAD_DIR=./uploads/             # Upload directory
OUTPUT_DIR=./outputs/             # Output directory
MAX_FILE_SIZE=52428800           # 50MB maximum file size
TEMP_FILE_TTL=3600000            # 1 hour temp file TTL
```

#### Monitoring
```bash
ENABLE_METRICS=true              # Enable Prometheus metrics
METRICS_PORT=9090               # Metrics server port
LOG_LEVEL=info                  # Logging level
HEALTH_CHECK_INTERVAL=30000     # Health check interval
```

#### Circuit Breaker
```bash
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5     # Failures before opening
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3     # Successes before closing
CIRCUIT_BREAKER_TIMEOUT=60000          # 1 minute timeout
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=120000 # 2 minutes recovery
```

### Multi-Instance Configuration

For high availability, configure multiple browserless instances:

```bash
# Primary instance
BROWSER_WS_ENDPOINT=wss://chrome.browserless.io?token=PRIMARY_TOKEN
BROWSER_TOKEN=PRIMARY_TOKEN
BROWSER_DOMAIN=chrome.browserless.io

# Secondary instances
BROWSERLESS_1_URL=wss://chrome-1.browserless.io?token=SECONDARY_TOKEN_1
BROWSERLESS_1_TOKEN=SECONDARY_TOKEN_1
BROWSERLESS_1_DOMAIN=chrome-1.browserless.io

BROWSERLESS_2_URL=wss://chrome-2.browserless.io?token=SECONDARY_TOKEN_2
BROWSERLESS_2_TOKEN=SECONDARY_TOKEN_2
BROWSERLESS_2_DOMAIN=chrome-2.browserless.io
```

## 🚀 Deployment

### Railway Deployment

1. **Prepare Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Deploy to Railway**
   ```bash
   railway login
   railway up
   ```

3. **Add Redis Service**
   ```bash
   railway add redis
   ```

4. **Configure Environment Variables**
   Set the following in Railway dashboard:
   - `API_KEY`: Your secret API key
   - `NODE_ENV`: production
   - `REDIS_URL`: Auto-provided by Railway Redis service

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t browserless-app .
   ```

2. **Run Container**
   ```bash
   docker run -d 
     --name browserless 
     -p 3000:3000 
     -e API_KEY=your-secret-key 
     -e REDIS_URL=redis://redis:6379 
     --link redis:redis 
     browserless-app
   ```

3. **Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: browserless
spec:
  replicas: 3
  selector:
    matchLabels:
      app: browserless
  template:
    metadata:
      labels:
        app: browserless
    spec:
      containers:
      - name: browserless
        image: browserless-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: browserless-secret
              key: api-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
```

## 📊 Monitoring

### Health Checks

The service provides comprehensive health monitoring:

- **Basic Health**: `GET /health`
- **Readiness**: `GET /health/ready`
- **Liveness**: `GET /health/live`
- **Service Status**: `GET /api/browser/status`

### Metrics

Prometheus metrics are available at `/metrics`:

- **Request Metrics**: Duration, count, error rate
- **Browser Metrics**: Active sessions, pool utilization
- **Memory Metrics**: Heap usage, garbage collection
- **Queue Metrics**: Job count, processing time
- **System Metrics**: CPU, memory, disk usage

### Logging

Structured logging with configurable levels:

```bash
LOG_LEVEL=info  # debug, info, warn, error
```

Logs include:
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Security events
- System health events

### Alerting

Set up alerts for:
- Error rate > 5%
- Response time > 30s
- Memory usage > 90%
- CPU usage > 85%
- Queue backlog > 80% capacity

## 🔒 Security

### Authentication
- API key authentication required for all browser operations
- Configurable CORS policies
- Request validation and sanitization

### Content Security
- URL validation and domain filtering
- Blocked internal/private networks
- Content type restrictions
- File size limits

### Browser Security
- Sandboxed browser execution
- Disabled dangerous features
- Process isolation
- Resource limits

### Network Security
- Firewall-friendly design
- No inbound connections required
- Configurable proxy support
- SSL/TLS encryption

## ⚡ Performance Tuning

### Browser Optimization
```bash
# Optimized browser arguments for performance
--disable-background-timer-throttling
--disable-backgrounding-occluded-windows
--disable-renderer-backgrounding
--disable-features=VizDisplayCompositor
--max-old-space-size=512
--memory-pressure-off
```

### Memory Management
- Automatic garbage collection
- Browser restart on memory leaks
- Session pooling and reuse
- Resource cleanup on timeouts

### Scaling Strategies
- Horizontal scaling with load balancer
- Vertical scaling with resource limits
- Queue-based job processing
- Circuit breaker pattern for resilience

### Caching
- Browser cache disabled for fresh results
- HTTP response caching
- Static asset optimization
- CDN integration ready

## 🔧 Troubleshooting

### Common Issues

**Memory Issues**
```bash
# Check memory usage
curl http://localhost:3000/health

# Force garbage collection (if enabled)
curl -X POST http://localhost:3000/api/browser/gc
```

**High Error Rates**
```bash
# Check service status
curl http://localhost:3000/api/browser/status

# Check circuit breaker status
curl http://localhost:3000/metrics | grep circuit_breaker
```

**Slow Performance**
```bash
# Check queue status
curl http://localhost:3000/api/browser/status

# Monitor metrics
curl http://localhost:3000/metrics
```

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug
```

Run with garbage collection exposed:
```bash
node --expose-gc dist/index.js
```

### Health Check Commands

```bash
# Basic health
curl http://localhost:3000/health

# Detailed status
curl -H "X-API-Key: your-key" http://localhost:3000/api/browser/status

# Metrics
curl http://localhost:3000/metrics
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the logs for error details

---

**Built for Production** • **Railway Ready** • **Monitoring Included** • **Security First**