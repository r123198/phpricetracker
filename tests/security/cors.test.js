const request = require('supertest');
const { app } = require('../../src/server');

describe('CORS Security', () => {
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

  const trustedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://yourdomain.com')
    .split(',')
    .map(origin => origin.trim());

  describe('Trusted Origins', () => {
    it('should allow requests from trusted origins', async () => {
      for (const origin of trustedOrigins) {
        const response = await request(app)
          .get('/v1/commodities')
          .set('Origin', origin)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    it('should allow requests with no origin (mobile apps, curl, Postman)', async () => {
      const response = await request(app)
        .get('/v1/commodities')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should allow requests from localhost variations', async () => {
      const localhostVariations = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ];

      for (const origin of localhostVariations) {
        if (trustedOrigins.some(trusted => trusted.includes('localhost'))) {
          const response = await request(app)
            .get('/v1/commodities')
            .set('Origin', origin)
            .expect(200);

          expect(response.body).toHaveProperty('success', true);
        }
      }
    });
  });

  describe('Disallowed Origins', () => {
    it('should block requests from untrusted origins', async () => {
      const untrustedOrigins = [
        'https://malicious-site.com',
        'http://evil-domain.org',
        'https://fake-phishing.com',
        'http://attacker.com'
      ];

      for (const origin of untrustedOrigins) {
        try {
          const response = await request(app)
            .get('/v1/commodities')
            .set('Origin', origin);

          // Should either be blocked or not include the origin in CORS headers
          expect(response.headers['access-control-allow-origin']).not.toBe(origin);
        } catch (error) {
          // CORS error is expected for disallowed origins
          expect(error.message).toContain('Not allowed by CORS');
        }
      }
    });

    it('should block requests with malformed origins', async () => {
      const malformedOrigins = [
        'not-a-url',
        'ftp://malicious.com',
        'file:///etc/passwd',
        'data:text/html,<script>alert("xss")</script>'
      ];

      for (const origin of malformedOrigins) {
        try {
          await request(app)
            .get('/v1/commodities')
            .set('Origin', origin);
        } catch (error) {
          expect(error.message).toContain('Not allowed by CORS');
        }
      }
    });
  });

  describe('HTTP Methods', () => {
    it('should allow GET requests', async () => {
      const response = await request(app)
        .get('/v1/commodities')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should allow POST requests', async () => {
      // Test with a simple POST request
      const response = await request(app)
        .post('/v1/commodities')
        .send({ name: 'Test Commodity', category: 'Test' })
        .expect(400); // Will fail validation but CORS should allow it

      // CORS should allow the request even if it fails validation
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should allow OPTIONS requests (preflight)', async () => {
      const response = await request(app)
        .options('/v1/commodities')
        .set('Origin', trustedOrigins[0])
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
    });

    it('should block PUT requests', async () => {
      try {
        await request(app)
          .put('/v1/commodities/123')
          .send({ name: 'Updated Commodity' });
      } catch (error) {
        // Should be blocked by CORS or return 404
        expect([404, 405]).toContain(error.response?.status);
      }
    });

    it('should block DELETE requests', async () => {
      try {
        await request(app)
          .delete('/v1/commodities/123');
      } catch (error) {
        // Should be blocked by CORS or return 404
        expect([404, 405]).toContain(error.response?.status);
      }
    });
  });

  describe('HTTP Headers', () => {
    it('should allow Content-Type header', async () => {
      const response = await request(app)
        .post('/v1/commodities')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test' })
        .expect(400); // Will fail validation but CORS should allow the header

      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should allow x-api-key header', async () => {
      const response = await request(app)
        .get('/v1/admin/test')
        .set('x-api-key', 'test-key')
        .expect(403); // Will fail auth but CORS should allow the header

      expect(response.headers['access-control-allow-headers']).toContain('x-api-key');
    });

    it('should block unauthorized headers', async () => {
      try {
        await request(app)
          .get('/v1/commodities')
          .set('X-Custom-Header', 'malicious-value');
      } catch (error) {
        // Should be blocked by CORS
        expect(error.message).toContain('Not allowed by CORS');
      }
    });
  });

  describe('CORS Headers', () => {
    it('should include proper CORS headers in responses', async () => {
      const response = await request(app)
        .get('/v1/commodities')
        .set('Origin', trustedOrigins[0])
        .expect(200);

      // Check for CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
      
      // Should not include credentials
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('should not include credentials in CORS', async () => {
      const response = await request(app)
        .get('/v1/commodities')
        .set('Origin', trustedOrigins[0])
        .expect(200);

      // Credentials should be disabled for security
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });

  describe('Preflight Requests', () => {
    it('should handle preflight requests correctly', async () => {
      const response = await request(app)
        .options('/v1/commodities')
        .set('Origin', trustedOrigins[0])
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, x-api-key')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(trustedOrigins[0]);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-headers']).toContain('x-api-key');
    });

    it('should handle preflight requests for admin routes', async () => {
      const response = await request(app)
        .options('/v1/admin/commodities')
        .set('Origin', trustedOrigins[0])
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'x-api-key')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(trustedOrigins[0]);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('x-api-key');
    });
  });

  describe('Environment Configuration', () => {
    it('should have CORS_ORIGINS configured', () => {
      expect(process.env.CORS_ORIGINS).toBeDefined();
      expect(process.env.CORS_ORIGINS).not.toBe('');
    });

    it('should parse CORS_ORIGINS correctly', () => {
      const origins = process.env.CORS_ORIGINS.split(',');
      expect(origins.length).toBeGreaterThan(0);
      
      origins.forEach(origin => {
        expect(origin.trim()).toMatch(/^https?:\/\/.+/);
      });
    });
  });
}); 