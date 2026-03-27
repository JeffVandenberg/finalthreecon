# Testing Documentation

This document describes the testing strategy and how to run tests for the Final Three Con Convention Management System.

## Overview

The project uses comprehensive testing at multiple levels:

- **Backend**: Jest + Supertest for unit and integration tests
- **Frontend**: Vitest + React Testing Library for component and integration tests
- **Test Coverage**: Aiming for >80% code coverage

## Backend Testing

### Technology Stack
- **Jest**: Test framework
- **ts-jest**: TypeScript support
- **Supertest**: HTTP assertions for API testing
- **@faker-js/faker**: Test data generation

### Running Backend Tests

```bash
cd backend

# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Test Structure

```
backend/tests/
├── setup.ts                          # Test configuration
├── unit/
│   ├── services/
│   │   ├── badge.service.test.ts    # Badge service tests
│   │   ├── ticket.service.test.ts   # Ticket service tests
│   │   └── eventAssignment.service.test.ts
│   └── middleware/
│       ├── auth.test.ts             # Authentication tests
│       ├── validation.test.ts        # Validation tests
│       └── errorHandler.test.ts     # Error handling tests
└── integration/
    └── badge.routes.test.ts         # API integration tests
```

### Backend Test Examples

#### Service Tests
```typescript
describe('BadgeService', () => {
  it('should create a new badge', async () => {
    const badgeData = { name: 'Test Badge' };
    const result = await badgeService.createBadge(badgeData);
    expect(result).toHaveProperty('id');
  });
});
```

#### Middleware Tests
```typescript
describe('authenticate', () => {
  it('should authenticate valid token', () => {
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    authenticate(mockRequest, mockResponse, nextFunction);
    expect(mockRequest.user).toBeDefined();
  });
});
```

#### Integration Tests
```typescript
describe('POST /badges', () => {
  it('should create a badge', async () => {
    const response = await request(app)
      .post('/badges')
      .send({ name: 'New Badge' });
    expect(response.status).toBe(201);
  });
});
```

## Frontend Testing

### Technology Stack
- **Vitest**: Test framework (Vite-native)
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: Browser environment simulation
- **MSW**: API mocking

### Running Frontend Tests

```bash
cd frontend

# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Test Structure

```
frontend/src/tests/
├── setup.ts                    # Test configuration
├── utils/
│   └── test-utils.tsx         # Custom render with providers
├── stores/
│   └── authStore.test.ts      # Zustand store tests
├── components/
│   └── Layout.test.tsx        # Component tests
├── pages/
│   └── Login.test.tsx         # Page component tests
└── lib/
    └── api.test.ts            # API client tests
```

### Frontend Test Examples

#### Store Tests
```typescript
describe('authStore', () => {
  it('should set auth data', () => {
    useAuthStore.getState().setAuth(mockUser, 'token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
```

#### Component Tests
```typescript
describe('Layout', () => {
  it('should render navigation links', () => {
    render(<Layout />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

#### User Interaction Tests
```typescript
it('should handle login form submission', async () => {
  const user = userEvent.setup();
  render(<Login />);

  await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
  await user.type(screen.getByPlaceholderText('Password'), 'password');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalled();
  });
});
```

## Test Coverage

### Backend Coverage Goals
- Services: 90%+
- Middleware: 90%+
- Routes: 80%+
- Overall: 85%+

### Frontend Coverage Goals
- Components: 80%+
- Stores: 90%+
- Pages: 75%+
- Overall: 80%+

### Viewing Coverage Reports

After running tests with coverage, open:
- Backend: `backend/coverage/index.html`
- Frontend: `frontend/coverage/index.html`

## Writing New Tests

### Backend Test Template

```typescript
import { ServiceName } from '../../../src/services/service-name.service';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client');

describe('ServiceName', () => {
  let service: ServiceName;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    service = new ServiceName();
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const mockData = { /* ... */ };
      mockPrisma.model.method.mockResolvedValue(mockData);

      // Act
      const result = await service.methodName();

      // Assert
      expect(result).toEqual(mockData);
    });
  });
});
```

### Frontend Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../utils/test-utils';
import ComponentName from '../../components/ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Continuous Integration

### GitHub Actions Workflow Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test
```

## Best Practices

### General
1. **AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test**: Focus on single behavior
3. **Descriptive names**: Test names should describe the scenario
4. **Isolate tests**: Each test should be independent
5. **Mock external dependencies**: Database, APIs, etc.

### Backend Specific
1. Mock Prisma client in all service tests
2. Use Supertest for route testing
3. Test error conditions and edge cases
4. Verify middleware behavior

### Frontend Specific
1. Use `screen` queries from Testing Library
2. Prefer `getByRole` over `getByTestId`
3. Test user interactions, not implementation
4. Mock API calls with consistent test data

## Common Issues & Solutions

### Backend

**Issue**: Prisma client not mocking correctly
```typescript
// Solution: Ensure proper mock in setup.ts
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({ ... }))
}));
```

**Issue**: Async timeout errors
```typescript
// Solution: Increase timeout in jest.config.js
testTimeout: 10000
```

### Frontend

**Issue**: "Not wrapped in act(...)" warning
```typescript
// Solution: Use waitFor for async updates
await waitFor(() => {
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

**Issue**: Router errors in tests
```typescript
// Solution: Use custom render with BrowserRouter
import { render } from '../utils/test-utils'; // Already includes router
```

## Test Data

### Factories & Fixtures

Consider creating test data factories:

```typescript
// tests/factories/badge.factory.ts
export const createMockBadge = (overrides = {}) => ({
  id: 'badge-1',
  name: 'Test Badge',
  badgeNumber: 1,
  checkedIn: false,
  ...overrides,
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Running Tests Before Commit

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
cd backend && npm test --passWithNoTests
cd ../frontend && npm test --passWithNoTests
```

## Summary

This comprehensive test suite ensures:
- ✅ Business logic correctness
- ✅ API endpoint functionality
- ✅ UI component behavior
- ✅ User interaction flows
- ✅ Error handling
- ✅ Authentication & authorization
- ✅ Data validation

Run tests frequently during development and always before pushing code!
