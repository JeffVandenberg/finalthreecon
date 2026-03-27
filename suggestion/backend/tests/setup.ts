// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    badge: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    badgeType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
    },
    badgeLog: {
      create: jest.fn(),
    },
    room: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    space: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    eventType: {
      findMany: jest.fn(),
    },
    daypart: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  })),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
