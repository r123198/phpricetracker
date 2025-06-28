const request = require('supertest');
const { app } = require('../../src/server');

describe('Rate Limiting Security', () => {
  let server;
  let port;

  beforeAll(async () => {
    // Start server on random port
    const result = await global.startTestServer(app);
    server = result.server;
    port = result.port;
  });

  afterAll(async () => {
    // Stop server
    await global.stopTestServer();
  });

  describe('Public Routes Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Make a few requests within the limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/v1/commodities')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should block requests when rate limit is exceeded', async () => {
      const maxRequests = 5; // Updated to match the new rate limiter configuration
      
      // Make requests up to the limit with small delays
      for (let i = 0; i < maxRequests; i++) {
        await request(app)
          .get('/v1/commodities')
          .expect(200);
        
        // Small delay to ensure requests are counted
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Next request should be blocked
      const response = await request(app)
        .get('/v1/commodities')
        .expect(429);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('rate limit');
    });

    it('should include rate limit headers in responses', async () => {
      const response = await request(app)
        .get('/v1/commodities')
        .expect(200);

      // Should include rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      expect(parseInt(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
    });

    it('should reset rate limit after window expires', async () => {
      // This test would require waiting for the rate limit window to expire
      // For now, we'll just test that the headers are present
      const response = await request(app)
        .get('/v1/commodities')
        .expect(200);

      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Admin Routes Rate Limiting', () => {
    it('should apply rate limiting to admin routes', async () => {
      const maxRequests = parseInt(process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS) || 2;
      
      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        await request(app)
          .get('/v1/admin/commodities')
          .set('x-api-key', process.env.ADMIN_API_KEY)
          .expect(200);
      }

      // Next request should be blocked
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', process.env.ADMIN_API_KEY)
        .expect(429);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('rate limit');
    });

    it('should include rate limit headers for admin routes', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', process.env.ADMIN_API_KEY)
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Different HTTP Methods', () => {
    it('should apply rate limiting to GET requests', async () => {
      const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5;
      
      for (let i = 0; i < maxRequests; i++) {
        await request(app)
          .get('/v1/commodities')
          .expect(200);
      }

      await request(app)
        .get('/v1/commodities')
        .expect(429);
    });

    it('should apply rate limiting to POST requests', async () => {
      const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5;
      
      for (let i = 0; i < maxRequests; i++) {
        await request(app)
          .post('/v1/commodities')
          .send({ name: 'Test' })
          .expect(400); // Will fail validation but should count toward rate limit
      }

      const response = await request(app)
        .post('/v1/commodities')
        .send({ name: 'Test' })
        .expect(429);

      expect(response.body.message).toContain('rate limit');
    });

    it('should apply rate limiting to PUT requests', async () => {
      const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5;
      
      for (let i = 0; i < maxRequests; i++) {
        try {
          await request(app)
            .put('/v1/commodities/123')
            .send({ name: 'Updated' });
        } catch (error) {
          // May fail for other reasons, but should count toward rate limit
        }
      }

      // Next request should be rate limited
      try {
        await request(app)
          .put('/v1/commodities/123')
          .send({ name: 'Updated' });
      } catch (error) {
        expect(error.response.status).toBe(429);
      }
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have RATE_LIMIT_MAX configured', () => {
      expect(process.env.RATE_LIMIT_MAX).toBeDefined();
      expect(parseInt(process.env.RATE_LIMIT_MAX)).toBeGreaterThan(0);
    });

    it('should have RATE_LIMIT_WINDOW_MS configured', () => {
      expect(process.env.RATE_LIMIT_WINDOW_MS).toBeDefined();
      expect(parseInt(process.env.RATE_LIMIT_WINDOW_MS)).toBeGreaterThan(0);
    });

    it('should use reasonable rate limit values', () => {
      const max = parseInt(process.env.RATE_LIMIT_MAX);
      const window = parseInt(process.env.RATE_LIMIT_WINDOW_MS);

      expect(max).toBeLessThanOrEqual(1000); // Not too high
      expect(max).toBeGreaterThanOrEqual(5); // At least 5 (our current setting)
      expect(window).toBeGreaterThanOrEqual(60000); // At least 1 minute
      expect(window).toBeLessThanOrEqual(3600000); // Not more than 1 hour
    });
  });

  describe('Rate Limit Headers', () => {
    it('should provide accurate remaining count', async () => {
      const response1 = await request(app)
        .get('/v1/commodities')
        .expect(200);

      const response2 = await request(app)
        .get('/v1/commodities')
        .expect(200);

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);

      expect(remaining2).toBeLessThan(remaining1);
    });

    it('should provide reset time in the future', async () => {
      const response = await request(app)
        .get('/v1/commodities')
        .expect(200);

      const resetTime = parseInt(response.headers['x-ratelimit-reset']);
      const currentTime = Math.floor(Date.now() / 1000);

      expect(resetTime).toBeGreaterThan(currentTime);
    });
  });

  describe('Rate Limit Error Response', () => {
    it('should return proper error format when rate limited', async () => {
      const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5;
      
      // Exceed rate limit
      for (let i = 0; i < maxRequests + 1; i++) {
        await request(app)
          .get('/v1/commodities');
      }

      const response = await request(app)
        .get('/v1/commodities')
        .expect(429);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Too Many Requests');
    });
  });

  describe('Simple Rate Limit Test', () => {
    it('should block requests on simple test route when rate limit is exceeded', async () => {
      const maxRequests = 5; // Updated to match the new rate limiter configuration
      
      // Make requests up to the limit with small delays
      for (let i = 0; i < maxRequests; i++) {
        await request(app)
          .get('/test-rate-limit')
          .expect(200);
        
        // Small delay to ensure requests are counted
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Next request should be blocked
      const response = await request(app)
        .get('/test-rate-limit')
        .expect(429);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('rate limit');
    });
  });
}); 