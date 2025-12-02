// Set up environment variables for testing BEFORE any module loading
// These provide defaults for test environment without production dependency
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'sentinel_test';
process.env.DB_USER = 'sentinel';
process.env.DB_PASSWORD = 'sentinel';
process.env.DATABASE_URL = 'postgresql://sentinel:sentinel@localhost:5432/sentinel_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test-password';
