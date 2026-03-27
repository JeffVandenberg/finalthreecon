# Final Three Con - Convention Management System

A modern, full-stack convention management system built to replace the legacy PHP application. This system handles badge management, event scheduling, ticketing, and reporting for gaming conventions.

## 🏗️ Architecture

### Backend
- **Node.js** + **TypeScript** + **Express**
- **Prisma ORM** for database management
- **MySQL** database
- **JWT** authentication
- **RESTful API** design
- Redis-ready for caching and background jobs

### Frontend
- **React** + **TypeScript** + **Vite**
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Tailwind CSS** for styling
- **React Router** for navigation

## 🚀 Features

- **Badge Management**: Track attendees by badge type with custom fields
- **Event Scheduling**: Create and manage convention events with rooms, spaces, and time slots
- **Ticketing System**: Register attendees for events with capacity management
- **Event Assignment Algorithm**: Preference-based event assignment system
- **Real-time Reports**: Badge summaries, event capacity tracking
- **Interactive Schedule Grid**: Visual event calendar by room and time
- **Authentication & Authorization**: Secure access with role-based permissions

## 📁 Project Structure

```
suggestion/
├── backend/               # Node.js API server
│   ├── prisma/           # Database schema and migrations
│   ├── src/
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helpers and utilities
│   └── package.json
│
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── stores/       # Zustand state stores
│   │   └── lib/          # API client and utilities
│   └── package.json
│
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- Redis (optional, for background jobs)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure `.env` with your settings:
```env
DATABASE_URL="mysql://user:password@localhost:3306/clocktowercon"
JWT_SECRET="your-secret-key-change-this"
PORT=3000
```

5. Run Prisma migrations:
```bash
npm run prisma:migrate
```

6. Generate Prisma client:
```bash
npm run prisma:generate
```

7. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure `.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 📊 Database Schema

The system uses the following core entities:

- **BadgeType**: Badge categories (Weekend, VIP, Friday-only, etc.)
- **Badge**: Individual attendee badges
- **Event**: Convention events
- **EventType**: Event categories (Panel, Clocktower, Workshop, etc.)
- **Room**: Physical venues
- **Space**: Venue areas
- **Daypart**: Time slots
- **Ticket**: Event registrations
- **User**: System users with authentication

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Badges
- `GET /api/badges` - List all badges
- `GET /api/badges/:id` - Get badge details
- `POST /api/badges` - Create badge
- `PUT /api/badges/:id` - Update badge
- `POST /api/badges/:id/check-in` - Check in badge

### Events
- `GET /api/events` - List events
- `GET /api/events/grid` - Get event schedule grid
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event

### Tickets
- `POST /api/tickets` - Register for event
- `DELETE /api/tickets/:id` - Unregister from event
- `GET /api/tickets/badge/:badgeId` - Get tickets by badge

### Reports
- `GET /api/reports/badge-summary` - Badge statistics
- `GET /api/reports/event-capacity` - Event capacity report

## 🎨 Frontend Pages

- **Dashboard**: Overview with badge statistics
- **Badges**: Search and manage attendee badges
- **Events**: Browse and manage convention events
- **Schedule**: Visual grid of events by room and time
- **Reports**: Analytics and capacity tracking

## 🚢 Production Deployment

### Backend
1. Build the TypeScript code:
```bash
npm run build
```

2. Set production environment variables

3. Run Prisma migrations:
```bash
npm run prisma:migrate
```

4. Start the server:
```bash
npm start
```

### Frontend
1. Build the production bundle:
```bash
npm run build
```

2. Deploy the `dist/` directory to your web server or CDN

## 🔄 Migration from Legacy PHP System

The new system maintains compatibility with the existing MySQL database structure. Data migration steps:

1. The Prisma schema matches existing table structures
2. Custom fields are stored as JSON (compatible with PHP's JSON storage)
3. UUIDs are preserved as VARCHAR(36)
4. All existing relationships are maintained

## 🧪 Development Tools

### Backend
- `npm run dev` - Start dev server with hot reload
- `npm run build` - Build for production
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Run ESLint

### Frontend
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🆚 Improvements Over Legacy System

### Architecture
- ✅ Separated API and frontend concerns
- ✅ Type-safe TypeScript throughout
- ✅ RESTful API design
- ✅ Proper error handling and validation
- ✅ Authentication and authorization

### Developer Experience
- ✅ Hot reload for rapid development
- ✅ Type checking prevents runtime errors
- ✅ Modern tooling (Vite, Prisma)
- ✅ Clear project structure

### Performance
- ✅ Efficient database queries with Prisma
- ✅ Client-side caching with TanStack Query
- ✅ Optimized frontend bundle
- ✅ Ready for Redis caching

### Maintainability
- ✅ Clean separation of concerns
- ✅ Reusable components
- ✅ Centralized API client
- ✅ Comprehensive error handling

### Security
- ✅ JWT-based authentication
- ✅ Input validation with Joi
- ✅ SQL injection prevention (Prisma)
- ✅ CORS configuration
- ✅ Helmet.js security headers

## 📝 TODO / Future Enhancements

- [ ] Implement Tabletop.Events API sync
- [ ] Add bulk event assignment with preference algorithm UI
- [ ] Implement background job queue with Bull
- [ ] Add email notifications
- [ ] Create admin panel for user management
- [ ] Add PDF export for print sheets
- [ ] Implement real-time updates with WebSockets
- [ ] Add comprehensive test suite
- [ ] Set up CI/CD pipeline
- [ ] Add monitoring and logging (e.g., Sentry)

## 🤝 Contributing

This is a cleaner, more maintainable architecture compared to the legacy PHP system. Key benefits:

1. **Separation of Concerns**: API and frontend are independent
2. **Type Safety**: TypeScript prevents many runtime errors
3. **Modern Stack**: Built with current best practices
4. **Scalability**: Easy to add features and scale
5. **Developer Friendly**: Clear structure and tooling

## 📄 License

MIT

## 👥 Credits

Built as a modern replacement for the Final Three Con PHP management system.
