# Database Seeding

## Quick Setup

To set up the database and create default test users:

```bash
# Push schema to database and seed users
npm run prisma:push

# Or run seed separately
npm run prisma:seed
```

## Default Test Users

After seeding, you can log in with these credentials:

| Role  | Email                     | Password  | Description        |
|-------|---------------------------|-----------|--------------------|
| Admin | admin@finalthreecon.com   | admin123  | Full access        |
| Staff | staff@finalthreecon.com   | staff123  | Staff permissions  |
| User  | user@finalthreecon.com    | user123   | Regular user       |

## Using the Test Users

### Frontend Login
1. Start the frontend: `cd ../frontend && npm run dev`
2. Navigate to: `http://localhost:5173/login`
3. Enter email and password from the table above

### API Login (via curl)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finalthreecon.com","password":"admin123"}'
```

### API Login (via JavaScript)
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@finalthreecon.com',
    password: 'admin123'
  })
});

const { data } = await response.json();
const token = data.token; // Use this token for authenticated requests
```

## Security Warning

⚠️ **IMPORTANT**: These are default test credentials.

- **DO NOT** use these in production
- **CHANGE** default passwords before deploying
- **DELETE** these users in production and create proper admin accounts
- Consider disabling the seed script in production builds

## Customizing Seed Data

Edit `prisma/seed.ts` to:
- Change default passwords
- Add more test users
- Create sample badge types, events, etc.
- Populate test data for development

## Troubleshooting

**"User already exists" error?**
- The seed script checks for existing users and skips creation
- This is normal if you've already run the seed

**Connection refused?**
- Ensure MySQL is running
- Check DATABASE_URL in `.env`
- Verify database exists: `npx prisma db push`

**Permission errors?**
- Check MySQL user has CREATE, INSERT permissions
- Verify DATABASE_URL credentials are correct
