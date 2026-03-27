# Backend API

Node.js/Express backend for Final Three Con management system.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure .env with your database credentials

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start development server
npm run dev
```

## Scripts

- `npm run dev` - Start dev server with hot reload (port 3000)
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests

## Tech Stack

- Express.js - Web framework
- Prisma - ORM and database client
- TypeScript - Type safety
- JWT - Authentication
- Joi - Validation
- Winston - Logging
- Jest - Testing framework

## Testing

The backend has comprehensive test coverage:

- **Unit Tests**: Service layer, middleware, utilities
- **Integration Tests**: API routes with mocked database
- **Coverage**: 85%+ overall

See [TESTING.md](../TESTING.md) for detailed testing documentation.

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode for development
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Test Structure

```
tests/
├── setup.ts                 # Test configuration
├── unit/
│   ├── services/           # Service layer tests
│   └── middleware/         # Middleware tests
└── integration/
    └── *.routes.test.ts    # API integration tests
```

## API Documentation

See main README.md for complete API documentation.

## Project Structure

```
src/
├── middleware/      # Express middleware (auth, validation, errors)
├── routes/          # API route definitions
├── services/        # Business logic layer
├── utils/           # Utility functions
└── index.ts         # Application entry point
```
