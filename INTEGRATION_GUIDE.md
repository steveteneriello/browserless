# Browserless Service Configuration Guide

## Overview
This document provides configuration instructions for integrating with the custom browserless service deployed on Railway.

## 🚨 Critical: Remove Old Environment Variables

**First, remove ALL of these old variables from Railway** (they cause conflicts):
```bash
BROWSER_DOMAIN
BROWSER_DOMAIN_PRIVATE  
BROWSER_PLAYWRIGHT_ENDPOINT
BROWSER_PLAYWRIGHT_ENDPOINT_PRIVATE
BROWSER_PORT_PRIVATE
BROWSER_WEBDRIVER_ENDPOINT
BROWSER_WEBDRIVER_ENDPOINT_PRIVATE
BROWSER_WS_ENDPOINT
BROWSER_WS_ENDPOINT_PRIVATE
CONCURRENT
CORS
QUEUED
TIMEOUT
```

## ✅ Required Railway Environment Variables

Set these environment variables in your Railway service:

```bash
NODE_ENV=production
TOKEN=bananalemon
BROWSER_TIMEOUT=45000
MAX_CONCURRENT_SESSIONS=1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=30
ENABLE_METRICS=true
LOG_LEVEL=info
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

## 🔗 Connection Configuration

### WebSocket Connection
```javascript
const websocketUrl = 'wss://your-railway-app.railway.app?token=bananalemon';
const ws = new WebSocket(websocketUrl);
```

### HTTP API Calls
```javascript
const baseUrl = 'https://your-railway-app.railway.app';
const token = 'bananalemon';

// Screenshot example
const response = await fetch(`${baseUrl}/api/browser/screenshot?token=${token}`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    format: 'png',
    fullPage: true,
    waitFor: 2000
  })
});

const screenshot = await response.buffer();
```

### Alternative Authentication Methods
```javascript
// Via X-API-Key header
headers: { 'X-API-Key': 'bananalemon' }

// Via Authorization header
headers: { 'Authorization': 'Bearer bananalemon' }

// Via query parameter (shown above)
?token=bananalemon
```

## 📡 Available API Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/browser/screenshot` | POST | Take screenshots | Required |
| `/api/browser/pdf` | POST | Generate PDFs | Required |
| `/api/browser/scrape` | POST | Scrape page content | Required |
| `/api/browser/evaluate` | POST | Execute JavaScript | Required |
| `/health` | GET | Health check | None |
| `/status` | GET | Service status & config | None |
| `/debug/config` | GET | Debug configuration | None |
| `/debug/test` | GET | Test browser functionality | None |

## 📝 API Request Examples

### Screenshot
```javascript
POST /api/browser/screenshot?token=bananalemon
Content-Type: application/json

{
  "url": "https://example.com",
  "format": "png",           // png, jpeg, webp
  "fullPage": true,          // capture full page
  "width": 1920,            // viewport width
  "height": 1080,           // viewport height
  "waitFor": 2000           // wait time in ms
}
```

### PDF Generation
```javascript
POST /api/browser/pdf?token=bananalemon
Content-Type: application/json

{
  "url": "https://example.com",
  "format": "A4",            // A4, Letter, Legal
  "printBackground": true,   // include background graphics
  "margin": {
    "top": "1cm",
    "bottom": "1cm",
    "left": "1cm", 
    "right": "1cm"
  }
}
```

### Web Scraping
```javascript
POST /api/browser/scrape?token=bananalemon
Content-Type: application/json

{
  "url": "https://example.com",
  "selector": "h1",          // CSS selector (optional)
  "waitFor": 3000           // wait time in ms
}
```

### JavaScript Execution
```javascript
POST /api/browser/evaluate?token=bananalemon
Content-Type: application/json

{
  "url": "https://example.com",
  "script": "document.title", // JavaScript to execute
  "waitFor": 2000
}
```

## ⚠️ Resource Limitations

**Railway Deployment Constraints:**
- **1 concurrent browser session maximum**
- **45-second timeout per request**
- **30 requests per 15 minutes rate limit**
- **128MB memory per browser session**

## 🔧 Circuit Breaker Configuration

Update your application's circuit breaker settings:

```javascript
const circuitBreakerConfig = {
  timeout: 60000,                    // 60 seconds (increased for Railway)
  errorThresholdPercentage: 50,      // Open after 50% errors
  resetTimeoutDuration: 30000,       // 30 seconds before retry
  bucketSpan: 10000,                 // 10 second buckets
  bucketNumber: 10                   // Track last 10 buckets
};
```

## 🚨 Error Handling

Handle these specific error responses:

```javascript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    switch (response.status) {
      case 401:
        throw new Error('Authentication failed - check token');
      case 429:
        throw new Error('Rate limit exceeded or max concurrent sessions reached');
      case 500:
        const error = await response.json();
        throw new Error(`Browser failed: ${error.message}`);
      default:
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
  
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Request timed out - service may be overloaded');
  }
  // Handle other errors...
}
```

## 🧪 Testing & Debugging

### Health Check
```bash
curl https://your-railway-app.railway.app/health
```

### Service Status
```bash
curl https://your-railway-app.railway.app/status
```

### Browser Test
```bash
curl https://your-railway-app.railway.app/debug/test
```

### Screenshot Test
```bash
curl -X POST https://your-railway-app.railway.app/api/browser/screenshot?token=bananalemon \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","format":"png"}' \
  --output test-screenshot.png
```

## 📊 Monitoring

Monitor these metrics:
- Response times (should be < 45 seconds)
- Error rates (circuit breaker opens at 50%)
- Memory usage (service restarts if exceeded)
- Request queue size

**Available monitoring endpoints:**
- `GET /health` - Basic health status
- `GET /metrics` - Prometheus metrics (if enabled)
- `GET /status` - Detailed service information

## 🔄 Migration from Old Service

If migrating from the old browserless.io service:

1. **Remove Playwright/WebDriver references** - This service uses Puppeteer only
2. **Update endpoint URLs** - Remove `/chromium/playwright` paths
3. **Lower concurrency expectations** - Max 1 browser vs previous 10
4. **Increase timeout tolerance** - Allow up to 60 seconds vs previous 30
5. **Update authentication** - Use `token` parameter instead of complex endpoint URLs

## 📈 Performance Optimization

To get the best performance:

1. **Minimize wait times** - Use only necessary `waitFor` values
2. **Optimize image formats** - Use WebP for smaller file sizes
3. **Batch requests** - Queue multiple screenshots rather than concurrent
4. **Cache results** - Avoid repeated screenshots of the same content
5. **Monitor rate limits** - Space requests to avoid 429 errors

## 🛠️ Troubleshooting

**Common Issues:**

1. **"Circuit breaker is open"** 
   - Wait 30 seconds and retry
   - Check if too many concurrent requests

2. **"Maximum concurrent sessions reached"**
   - Only 1 browser allowed on Railway
   - Wait for current session to complete

3. **"Browser launch failed"**
   - Service may be out of memory
   - Check Railway logs for details

4. **Authentication errors**
   - Verify token is exactly: `bananalemon`
   - Check token is in query parameter or header

5. **Timeout errors**
   - Increase client timeout to 60+ seconds
   - Reduce `waitFor` values in requests

## 🔒 Security Notes

- The token `bananalemon` is for development/testing
- Change to a secure token for production
- Service includes rate limiting and CORS protection
- All endpoints except auth-required ones are publicly accessible

---

**Service Version:** 1.0.0  
**Last Updated:** August 24, 2025  
**Railway Optimized:** Yes  
**Memory Limit:** 1GB  
**Max Concurrent Sessions:** 1
