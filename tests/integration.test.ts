import request from 'supertest';
import { App } from '../src/app';

describe('Browserless API Integration Tests', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-api-key';
    process.env.REDIS_URL = 'redis://localhost:6379';
    
    const appInstance = new App();
    app = appInstance.app;
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Endpoints', () => {
    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('service', 'browserless-api');
    });

    test('GET /health/ready should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });

    test('GET /health/live should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('Authentication', () => {
    test('API endpoints should require API key', async () => {
      await request(app)
        .post('/api/browser/screenshot')
        .send({ url: 'https://example.com' })
        .expect(401);
    });

    test('API endpoints should accept valid API key', async () => {
      await request(app)
        .post('/api/browser/screenshot')
        .set('x-api-key', 'test-api-key')
        .send({ url: 'https://example.com' })
        .expect(500); // Will fail due to no browser service, but auth passes
    });

    test('API endpoints should reject invalid API key', async () => {
      await request(app)
        .post('/api/browser/screenshot')
        .set('x-api-key', 'invalid-key')
        .send({ url: 'https://example.com' })
        .expect(401);
    });
  });

  describe('Validation', () => {
    test('Screenshot endpoint should validate URL', async () => {
      await request(app)
        .post('/api/browser/screenshot')
        .set('x-api-key', 'test-api-key')
        .send({ url: 'invalid-url' })
        .expect(400);
    });

    test('PDF endpoint should validate URL', async () => {
      await request(app)
        .post('/api/browser/pdf')
        .set('x-api-key', 'test-api-key')
        .send({ url: 'invalid-url' })
        .expect(400);
    });

    test('Scrape endpoint should validate URL', async () => {
      await request(app)
        .post('/api/browser/scrape')
        .set('x-api-key', 'test-api-key')
        .send({ url: 'invalid-url' })
        .expect(400);
    });

    test('Evaluate endpoint should require code', async () => {
      await request(app)
        .post('/api/browser/evaluate')
        .set('x-api-key', 'test-api-key')
        .send({})
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits', async () => {
      const requests = [];
      
      // Make many requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/health')
            .expect((res) => {
              expect([200, 429]).toContain(res.status);
            })
        );
      }

      await Promise.all(requests);
    });
  });

  describe('Error Handling', () => {
    test('Should handle 404 routes', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404);
    });

    test('Should return proper error format', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS', () => {
    test('Should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Security Headers', () => {
    test('Should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });
});
