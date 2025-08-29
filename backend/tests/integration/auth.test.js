const request = require('supertest');
const app = require('../../src/server');
const { User } = require('../../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Authentication API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        first_name: 'New',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.password).toBeUndefined();

      // Verify user was created in database
      const user = await User.findOne({ where: { email: userData.email } });
      expect(user).toBeTruthy();
      expect(user.email_verified).toBe(false);
      expect(user.status).toBe('pending');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'SecurePassword123!',
        first_name: 'Test',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
        first_name: 'Test',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      // Create first user
      await testUtils.createTestUser({ email: 'duplicate@example.com' });

      const userData = {
        username: 'newuser',
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        first_name: 'New',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser({
        email: 'login@example.com',
        password: await bcrypt.hash('TestPassword123!', 12)
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.password).toBeUndefined();

      // Verify JWT token
      const decoded = jwt.verify(response.body.data.access_token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login for unverified user', async () => {
      const unverifiedUser = await testUtils.createTestUser({
        email: 'unverified@example.com',
        password: await bcrypt.hash('TestPassword123!', 12),
        email_verified: false
      });

      const loginData = {
        email: 'unverified@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email verification');
    });

    it('should reject login for suspended user', async () => {
      const suspendedUser = await testUtils.createTestUser({
        email: 'suspended@example.com',
        password: await bcrypt.hash('TestPassword123!', 12),
        status: 'suspended'
      });

      const loginData = {
        email: 'suspended@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('suspended');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser, refreshToken;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser();
      
      // Generate refresh token
      refreshToken = jwt.sign(
        { userId: testUser.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();

      // Verify new access token
      const decoded = jwt.verify(response.body.data.access_token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.type).toBe('access');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: expiredToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser, accessToken;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser();
      accessToken = testUtils.generateTestToken(testUser.id);
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser({ email: 'forgot@example.com' });
    });

    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset email sent');

      // Verify reset token was created
      await testUser.reload();
      expect(testUser.password_reset_token).toBeDefined();
      expect(testUser.password_reset_expires).toBeDefined();
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset email sent');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.message).toContain('Too many requests');
    });
  });
});