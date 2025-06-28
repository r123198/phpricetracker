const request = require('supertest');
const { app } = require('../../src/server');

describe('API Key Authentication', () => {
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

  describe('Public Routes', () => {
    it('should allow access to public routes without API key', async () => {
      const response = await request(app)
        .get('/v1/commodities')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should allow access to health check without API key', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should allow access to API documentation without API key', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);

      expect(response.status).toBe(200);
    });
  });

  describe('Protected Routes', () => {
    it('should require API key for protected routes', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('API key');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', 'invalid-key')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject requests with malformed API key', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', '')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Admin Routes', () => {
    it('should require admin API key for admin routes', async () => {
      // Test with regular API key (should fail)
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', process.env.API_KEY)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('admin');
    });

    it('should allow access with valid admin API key', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', process.env.ADMIN_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should allow POST requests with admin API key', async () => {
      const response = await request(app)
        .post('/v1/admin/commodities')
        .set('x-api-key', process.env.ADMIN_API_KEY)
        .send({ name: 'Test Commodity', category: 'Test' })
        .expect(400); // Will fail validation but auth should pass

      expect(response.body).toHaveProperty('success', false);
      // Should not be an auth error
      expect(response.body.message).not.toContain('API key');
    });
  });

  describe('API Key Header', () => {
    it('should accept API key in x-api-key header', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', process.env.ADMIN_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should accept API key in Authorization header', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('Authorization', `Bearer ${process.env.ADMIN_API_KEY}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject requests with wrong header format', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('Authorization', 'Basic invalid')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Environment Configuration', () => {
    it('should have API_KEY configured', () => {
      expect(process.env.API_KEY).toBeDefined();
      expect(process.env.API_KEY).not.toBe('');
    });

    it('should have ADMIN_API_KEY configured', () => {
      expect(process.env.ADMIN_API_KEY).toBeDefined();
      expect(process.env.ADMIN_API_KEY).not.toBe('');
    });

    it('should have different keys for regular and admin access', () => {
      expect(process.env.API_KEY).not.toBe(process.env.ADMIN_API_KEY);
    });
  });

  describe('Security Headers', () => {
    it('should not expose API key in response headers', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', process.env.ADMIN_API_KEY)
        .expect(200);

      // Should not expose the API key in any headers
      const headers = response.headers;
      Object.values(headers).forEach(headerValue => {
        expect(headerValue).not.toContain(process.env.ADMIN_API_KEY);
      });
    });

    it('should not expose API key in error messages', async () => {
      const response = await request(app)
        .get('/v1/admin/commodities')
        .set('x-api-key', 'invalid-key')
        .expect(401);

      // Error message should not contain the invalid key
      expect(response.body.message).not.toContain('invalid-key');
    });
  });
}); 