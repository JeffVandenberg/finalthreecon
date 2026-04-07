# Deployment Status & Handoff Document

**Last Updated:** 2026-03-28
**Project:** FinalThreeCon Backend API

## Current Status: ✅ API Working, ⚠️ Bull Queue Issues

### What's Working
- ✅ Cloud Run API deployed and accessible at: `https://finalthreecon-api-74xkibz4aa-uc.a.run.app`
- ✅ Cloud SQL database (MySQL) with public IP: `34.172.166.16:3306`
- ✅ Prisma migrations deployed successfully
- ✅ Database seeded with admin user
- ✅ Basic API endpoints responding (rooms, event-types, etc.)
- ✅ Authentication working (JWT tokens)

### What's NOT Working
- ❌ Bull Queue / Redis connection (Cloud Run → Upstash TCP timeouts)
- ❌ Sync jobs cannot be queued (depends on Bull/Redis)
- ❌ Data from Tabletop.Events API not synced yet

---

## Environment Configuration

### Secrets in Google Secret Manager
```
database-url (version 2):
  mysql://root:ConventionDB2025!Secure@34.172.166.16:3306/clocktower_production

redis-url (latest):
  rediss://default:AZidAAIncDE0NTI3MjgzYmZhODQ0ZGYxYWRkMjMxNWIxMjNhNDhlOXAxMzkwNjk@evolving-garfish-39069.upstash.io:6379

jwt-secret: (set)
tte-api-key: (set)
tte-api-password: (set)
```

### Service Account Permissions
Service account: `651423113194-compute@developer.gserviceaccount.com`
Has access to: database-url, redis-url, jwt-secret, tte-api-key, tte-api-password

### Cloud Run Services
1. **finalthreecon-api** (us-central1)
   - Currently: NO VPC connector (removed for testing)
   - VPC egress: private-ranges-only
   - Image: `gcr.io/bg-con-platform/finalthreecon-backend:latest`
   - Min instances: 0, Max: 10
   - Memory: 512Mi, CPU: 1

2. **finalthreecon-worker** (us-central1)
   - VPC connector: finalthreecon-connector
   - VPC egress: all-traffic
   - Min instances: 1, Max: 3
   - Currently failing to start (Bull queue connection issues)

### Cloud SQL
- Instance: `finalthreecon-db`
- Region: us-central1
- Public IP: `34.172.166.16`
- Private IP: `10.31.0.3`
- Authorized networks: `0.0.0.0/0` (all IPs - TEMPORARY)
- Root password: `ConventionDB2025!Secure` (with quotes in shell)

### Upstash Redis
- Endpoint: `evolving-garfish-39069.upstash.io`
- Port: 6379
- TLS: Enabled (rediss://)
- Token: `AZidAAIncDE0NTI3MjgzYmZhODQ0ZGYxYWRkMjMxNWIxMjNhNDhlOXAxMzkwNjk`
- REST API: `https://evolving-garfish-39069.upstash.io`

---

## Authentication

### Default Users (from seed)
```
Admin:
  Email: admin@finalthreecon.com
  Password: admin123

Staff:
  Email: staff@finalthreecon.com
  Password: staff123

User:
  Email: user@finalthreecon.com
  Password: user123
```

### Getting JWT Token
```bash
curl -X POST https://finalthreecon-api-74xkibz4aa-uc.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finalthreecon.com","password":"admin123"}'
```

---

## Known Issues & Root Cause

### Issue #1: Bull Queue Redis Connection Timeouts

**Symptoms:**
```
Error: connect ETIMEDOUT
at TLSSocket.<anonymous> (/app/node_modules/ioredis/built/Redis.js:171:41)
```

**Root Cause:**
Cloud Run services use dynamic IP addresses. When connecting to external services like Upstash over TCP (port 6379), connections timeout due to:
1. Cloud Run's ephemeral IPs + NAT gateway issues
2. VPC connector routing problems
3. First-call cold start timeouts

**What We Tried:**
- ✅ Verified connection works locally (test-redis.js)
- ✅ Configured proper TLS with `servername` and `family: 4`
- ✅ Tested with and without VPC connector
- ✅ Changed VPC egress settings (all-traffic, private-ranges-only)
- ❌ Still times out in Cloud Run

**Solution Options:**
1. **Option A (Quick):** Remove Bull queue, run syncs synchronously without queuing
2. **Option B (Better):** Switch to Upstash REST API over HTTPS instead of TCP
3. **Option C (Complex):** Use Cloud NAT with static IP (has known cold-start timeout issues)
4. **Option D:** Use Google Cloud Memorystore for Redis (in same VPC)

---

## Critical Files Modified

### Prisma Configuration (Prisma 7 changes)
- `prisma/schema.prisma` - Removed `url` from datasource
- `prisma.config.ts` - New file for DATABASE_URL configuration
- Migration approach: Uses `npx prisma migrate deploy` (not `migrate dev`)

### Redis/Queue Configuration
- `src/utils/queue.ts` - Parses `rediss://` URL with TLS config
  ```typescript
  family: 4,  // Force IPv4
  tls: { servername: url.hostname },  // Proper SNI
  ```

### Cloud Build
- `cloudbuild.yaml` - Updated to use:
  - `--vpc-egress=all-traffic` for API service
  - `--set-secrets=REDIS_URL=redis-url:latest` (instead of separate host/port/password)

---

## Security Notes (TODO: Fix Later)

⚠️ **Temporary Insecure Configurations:**

1. **Database Public IP** - Currently using `34.172.166.16` with `0.0.0.0/0` authorized
   - **Fix:** Re-enable private IP, use `10.31.0.3` with VPC connector

2. **No VPC Connector on API** - Removed for testing
   - **Fix:** Add back VPC connector with proper egress settings

3. **VPC Egress all-traffic** - Routes everything through internet
   - **Fix:** Use `private-ranges-only` with private DB IP

---

## Next Steps

### Immediate (Get Sync Working)
1. Choose Bull queue solution (Option A, B, C, or D above)
2. Implement chosen solution
3. Test sync endpoint:
   ```bash
   curl -X POST https://finalthreecon-api-74xkibz4aa-uc.a.run.app/api/sync/all \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
4. Verify data syncs from Tabletop.Events API

### After Sync Works
1. Re-secure database (private IP + VPC)
2. Fix VPC connector configuration
3. Remove `0.0.0.0/0` from authorized networks
4. Document final architecture

---

## Useful Commands

### Deploy
```bash
cd suggestion/backend
gcloud builds submit --config=cloudbuild.yaml
```

### Check Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=finalthreecon-api" --limit=20 --project=bg-con-platform
```

### Update Service
```bash
gcloud run services update finalthreecon-api --region us-central1 --vpc-egress=all-traffic
```

### Test Database Connection
```bash
mysql -h 34.172.166.16 -u root -p'ConventionDB2025!Secure' clocktower_production
```

### Local Redis Test
```bash
cd suggestion/backend
node test-redis.js
```

---

## Project Structure
```
suggestion/backend/
├── src/
│   ├── routes/         # API routes (auth, sync, events, etc.)
│   ├── services/       # Business logic (sync manager, etc.)
│   ├── jobs/           # Bull queue job processors
│   ├── utils/          # Queue, logger, etc.
│   └── index.ts        # Main entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed data
├── prisma.config.ts    # Prisma 7 config
├── cloudbuild.yaml     # GCP deployment config
├── Dockerfile          # Container build
└── test-redis.js       # Local Redis connection tester
```

---

## Contact Info
- GCP Project: `bg-con-platform`
- Region: `us-central1`
- Tabletop.Events Convention ID: `D46EFC1C-696B-11F0-B23F-52367E479804`
- TTE API User: `jeffvandenberg`
