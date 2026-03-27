# Sync API Documentation

The Sync API provides endpoints to synchronize data from the Tabletop.Events API to the local MySQL database. All sync endpoints require admin authentication.

## Architecture

- **Background Jobs**: Sync operations run as background jobs using Bull (Redis-based queue)
- **Progress Tracking**: Each sync creates a `SyncJob` record in the database to track progress
- **Rate Limiting**: Implements 250ms delays between API requests to respect TTE API limits
- **Dependency Order**: Full sync executes in order: base-data → event-types → events → badges → tickets

## Prerequisites

1. **Redis**: Must be running for Bull queue
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Environment Variables**: Configure TTE API credentials in `.env`
   ```
   TTE_API_URL=https://tabletop.events/api
   TTE_CONVENTION_ID=your-convention-id
   TTE_API_KEY=your-api-key
   TTE_API_USER=your-username
   TTE_API_PASSWORD=your-password
   ```

3. **Database Schema**: Run Prisma migrations
   ```bash
   npm run prisma:push
   ```

## API Endpoints

### Trigger Sync Operations

All POST endpoints return immediately with a job ID. The actual sync runs in the background.

#### POST /api/sync/base-data
Syncs foundational data (spaces, rooms, dayparts).

**Response:**
```json
{
  "message": "Base data sync initiated",
  "syncJobId": "uuid",
  "statusUrl": "/api/sync/status/uuid"
}
```

#### POST /api/sync/event-types
Syncs event type definitions and room-eventtype mappings.

#### POST /api/sync/events
Syncs events with multi-space support.

#### POST /api/sync/badges
Syncs attendee badges with custom fields.

#### POST /api/sync/tickets
Syncs event registrations (tickets).

#### POST /api/sync/all
Executes full sync of all entities in dependency order.

**Response:**
```json
{
  "message": "Full sync initiated (base-data → event-types → events → badges → tickets)",
  "syncJobId": "uuid",
  "statusUrl": "/api/sync/status/uuid"
}
```

### Monitor Sync Status

#### GET /api/sync/status/:jobId
Get detailed status of a specific sync job.

**Response:**
```json
{
  "id": "uuid",
  "type": "all",
  "status": "active",
  "progress": 60,
  "total": 100,
  "recordCount": 1234,
  "metadata": {
    "base-data": { "recordCount": 150, "spaceCount": 50, "roomCount": 75, "daypartCount": 25 },
    "event-types": { "recordCount": 45, "eventTypeCount": 30, "roomEventTypeCount": 15 }
  },
  "error": null,
  "startedAt": "2026-02-21T10:00:00.000Z",
  "completedAt": null,
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@finalthreecon.com"
  }
}
```

**Status Values:**
- `pending`: Job queued but not started
- `active`: Currently processing
- `completed`: Successfully finished
- `failed`: Encountered an error

#### GET /api/sync/status?limit=20
Get list of recent sync jobs (default limit: 20).

**Response:**
```json
{
  "syncJobs": [
    {
      "id": "uuid",
      "type": "all",
      "status": "completed",
      "recordCount": 5432,
      "startedAt": "2026-02-21T10:00:00.000Z",
      "completedAt": "2026-02-21T10:05:32.000Z",
      "user": { ... }
    }
  ]
}
```

#### GET /api/sync/last-syncs
Get the last successful sync time for each entity type.

**Response:**
```json
{
  "base-data": "2026-02-21T10:00:00.000Z",
  "event-types": "2026-02-21T10:01:00.000Z",
  "events": "2026-02-21T10:03:00.000Z",
  "badges": "2026-02-21T10:04:00.000Z",
  "tickets": "2026-02-21T10:05:00.000Z",
  "all": "2026-02-21T10:05:32.000Z"
}
```

## Usage Examples

### Using curl

```bash
# Login to get JWT token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finalthreecon.com","password":"admin123"}' \
  | jq -r '.token')

# Trigger full sync
SYNC_RESPONSE=$(curl -X POST http://localhost:3000/api/sync/all \
  -H "Authorization: Bearer $TOKEN")

SYNC_JOB_ID=$(echo $SYNC_RESPONSE | jq -r '.syncJobId')

# Monitor sync status
curl http://localhost:3000/api/sync/status/$SYNC_JOB_ID \
  -H "Authorization: Bearer $TOKEN"

# Check last sync times
curl http://localhost:3000/api/sync/last-syncs \
  -H "Authorization: Bearer $TOKEN"
```

### Using JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

// Login
const { data: authData } = await axios.post(`${API_BASE}/auth/login`, {
  email: 'admin@finalthreecon.com',
  password: 'admin123'
});

const token = authData.token;
const headers = { Authorization: `Bearer ${token}` };

// Trigger full sync
const { data: syncData } = await axios.post(`${API_BASE}/sync/all`, {}, { headers });
const syncJobId = syncData.syncJobId;

// Poll for status
const pollInterval = setInterval(async () => {
  const { data: status } = await axios.get(
    `${API_BASE}/sync/status/${syncJobId}`,
    { headers }
  );

  console.log(`Progress: ${status.progress}% - ${status.status}`);

  if (status.status === 'completed') {
    console.log(`Sync completed! Records synced: ${status.recordCount}`);
    clearInterval(pollInterval);
  } else if (status.status === 'failed') {
    console.error(`Sync failed: ${status.error}`);
    clearInterval(pollInterval);
  }
}, 2000); // Check every 2 seconds
```

## Sync Strategy

### Truncate-and-Replace
All sync operations use a truncate-and-replace strategy:
1. Truncate existing table data
2. Fetch all records from TTE API (paginated)
3. Insert records into local database
4. Update sync job status

This ensures data consistency and matches the legacy PHP implementation behavior.

### Multi-Space Events
Events can be assigned to multiple spaces. The system creates duplicate event records for each space, allowing proper room filtering and scheduling.

### Validation
- **Events**: Validates room/space exists before inserting
- **Badges**: Validates badge type exists before inserting
- **Tickets**: Validates both event and badge exist before inserting (skips orphaned records)

## Error Handling

### Automatic Retries
Bull queue is configured to retry failed jobs:
- **Max Attempts**: 3
- **Backoff**: Exponential (2s, 4s, 8s)

### Error Logging
Failed syncs are logged with:
- Error message and stack trace
- Sync job ID and type
- Number of retry attempts

### Manual Recovery
If a sync fails after all retries:
1. Check sync job status: `GET /api/sync/status/:jobId`
2. Review error message in response
3. Fix underlying issue (credentials, network, database)
4. Re-trigger sync for that specific type

## Performance Considerations

### Expected Sync Times
Estimates based on API rate limiting (250ms per request):
- **Base Data**: ~2-5 minutes (100-200 rooms)
- **Event Types**: ~3-5 minutes (100 rooms × relationship API)
- **Events**: ~5-10 minutes (2000-5000 events)
- **Badges**: ~3-5 minutes (1000-2000 badges)
- **Tickets**: ~5-10 minutes (5000-10000 tickets)
- **Full Sync**: ~20-35 minutes total

### Database Performance
- Uses transactions for data consistency
- Truncates tables before bulk insert (faster than upsert)
- Indexes on foreign keys for relationship validation

## Monitoring

### Check Queue Status
```bash
# Using Redis CLI
redis-cli
> LLEN bull:sync-jobs:waiting
> LLEN bull:sync-jobs:active
> LLEN bull:sync-jobs:failed
```

### Database Query
```sql
-- Recent sync jobs
SELECT id, type, status, progress, recordCount, startedAt, completedAt
FROM sync_jobs
ORDER BY startedAt DESC
LIMIT 10;

-- Failed syncs
SELECT id, type, error, startedAt
FROM sync_jobs
WHERE status = 'failed'
ORDER BY startedAt DESC;
```

## Troubleshooting

### "Session expired" errors
- Sessions expire after 1 hour
- Service automatically creates new sessions
- Check TTE API credentials in `.env`

### "Redis connection failed" errors
- Ensure Redis is running: `docker ps` or `redis-cli ping`
- Check Redis connection settings in `.env`

### "Foreign key constraint" errors
- Run syncs in dependency order
- For full sync, use `POST /api/sync/all` which handles order automatically

### Slow sync performance
- Check TTE API response times
- Review rate limiting delays (250ms between requests)
- Consider increasing timeout values if needed
