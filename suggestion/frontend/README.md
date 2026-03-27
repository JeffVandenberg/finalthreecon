# Frontend Application

React + TypeScript frontend for Final Three Con management system.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

## Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI

## Tech Stack

- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool and dev server
- TanStack Query - Data fetching and caching
- Zustand - State management
- Tailwind CSS - Styling
- React Router - Navigation
- Lucide React - Icons

## Testing

The frontend has comprehensive test coverage:

- **Component Tests**: UI component rendering and behavior
- **Store Tests**: State management logic
- **Integration Tests**: User flows and interactions
- **Coverage**: 80%+ overall

See [TESTING.md](../TESTING.md) for detailed testing documentation.

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode for development
npm run test:watch

# Run tests with interactive UI
npm run test:ui
```

### Test Structure

```
src/tests/
├── setup.ts            # Test configuration
├── utils/              # Test utilities and custom render
├── stores/             # Store tests
├── components/         # Component tests
├── pages/              # Page component tests
└── lib/                # API client tests
```

## Features

- Dashboard with statistics
- Badge management
- Event management
- Interactive schedule grid
- Reports and analytics
- Authentication

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components (routes)
├── stores/         # Zustand state stores
├── lib/            # API client and utilities
├── tests/          # Test files
├── App.tsx         # Main app component
└── main.tsx        # Application entry point
```

## Default Credentials

After setting up the backend, you'll need to create a user account via the registration page or API.
