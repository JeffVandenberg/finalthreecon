# GCP Cloud Run Deployment Guide

Complete guide to deploying the Convention Management System to Google Cloud Platform using Cloud Run.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [GCP Project Setup](#gcp-project-setup)
4. [Infrastructure Setup](#infrastructure-setup)
5. [Secret Manager Configuration](#secret-manager-configuration)
6. [Cloud Build Setup](#cloud-build-setup)
7. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
8. [Initial Database Migration](#initial-database-migration)
9. [Testing](#testing)
10. [Cost Management](#cost-management)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Services

- **Frontend**: Vercel (Static React/Vite build)
- **Backend API**: Cloud Run (Containerized Node.js/Express)
- **Background Worker**: Cloud Run (Same container, WORKER_ONLY mode)
- **Database**: Cloud SQL MySQL (Private IP)
- **Redis**: Memorystore Redis Basic OR Upstash (free alternative)
- **Build**: Cloud Build (Automated CI/CD from GitHub)
- **Secrets**: Secret Manager (Environment variables)
- **Networking**: VPC Connector (Private communication)

### Data Flow

```
User → Vercel (Frontend) → Cloud Run API → Cloud SQL
                               ↓
                          Cloud Run Worker → Redis → Background Jobs
```

---

## Prerequisites

### Required Accounts

- [x] Google Cloud Platform account with billing enabled
- [x] GitHub account (for source code repository)
- [x] Vercel account (for frontend hosting)
- [x] *(Optional)* Upstash account for free Redis

### Required Tools

Install the following on your local machine:

```bash
# Google Cloud SDK
# Download from: https://cloud.google.com/sdk/docs/install

# Verify installation
gcloud --version

# Authenticate
gcloud auth login

# Docker (for local testing)
docker --version
```

---

## GCP Project Setup

### 1. Create New GCP Project

```bash
# Set project ID (must be globally unique)
export PROJECT_ID="finalthreecon-prod"
export REGION="us-central1"

# Create project
gcloud projects create $PROJECT_ID --name="Final Three Con"

# Set as active project
gcloud config set project $PROJECT_ID

# Link billing account (replace with your billing account ID)
# Find your billing account: gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  vpcaccess.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  containerregistry.googleapis.com \
  sourcerepo.googleapis.com
```

**Expected time**: 2-3 minutes

---

## Infrastructure Setup

### 1. Create VPC Connector

```bash
# Create Serverless VPC Access connector for private communication
gcloud compute networks vpc-access connectors create finalthreecon-connector \
  --region=$REGION \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=3

# Verify creation
gcloud compute networks vpc-access connectors describe finalthreecon-connector \
  --region=$REGION
```

**Expected time**: 3-5 minutes
**Cost**: ~$8-10/month (for 2-3 instances)

### 2. Create Cloud SQL Instance

```bash
# Create Cloud SQL MySQL instance with private IP
gcloud sql instances create finalthreecon-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=$REGION \
  --network=default \
  --no-assign-ip \
  --enable-bin-log \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4

# Set root password
gcloud sql users set-password root \
  --instance=finalthreecon-db \
  --password="YOUR_SECURE_ROOT_PASSWORD"

# Create database
gcloud sql databases create clocktower_production \
  --instance=finalthreecon-db

# Get private IP address (save this!)
gcloud sql instances describe finalthreecon-db \
  --format="value(ipAddresses[0].ipAddress)"
```

**Expected time**: 10-15 minutes
**Cost**: ~$10/month (db-f1-micro with 10GB storage)

### 3. Create Redis Instance

**Option A: Memorystore Redis** (~$12-15/month)

```bash
# Create Memorystore Redis instance
gcloud redis instances create finalthreecon-redis \
  --size=1 \
  --region=$REGION \
  --tier=basic \
  --network=default

# Get Redis host (save this!)
gcloud redis instances describe finalthreecon-redis \
  --region=$REGION \
  --format="value(host)"
```

**Expected time**: 5-7 minutes
**Cost**: ~$12-15/month (1GB Basic tier)

**Option B: Upstash Redis** (FREE - Recommended for learning)

1. Go to [upstash.com](https://upstash.com)
2. Sign up and create a new Redis database
3. Select region closest to `us-central1` (e.g., `us-east-1`)
4. Copy the connection details:
   - `REDIS_HOST`: endpoint URL (e.g., `us1-example-12345.upstash.io`)
   - `REDIS_PASSWORD`: your password
   - `REDIS_PORT`: usually `6379` or `6380`

**Cost**: FREE (500K commands/month)

---

## Secret Manager Configuration

### 1. Create Secrets

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Get Cloud SQL private IP (from step 2 above)
CLOUD_SQL_IP="<YOUR_CLOUD_SQL_PRIVATE_IP>"

# Get Redis host (from step 3 above)
REDIS_HOST="<YOUR_REDIS_HOST>"

# Create database URL secret
echo -n "mysql://root:YOUR_SECURE_ROOT_PASSWORD@${CLOUD_SQL_IP}:3306/clocktower_production" | \
  gcloud secrets create database-url --data-file=-

# Create Redis host secret
echo -n "${REDIS_HOST}" | \
  gcloud secrets create redis-host --data-file=-

# Create JWT secret
echo -n "${JWT_SECRET}" | \
  gcloud secrets create jwt-secret --data-file=-

# Create TTE API credentials
echo -n "732CF58A-930F-11F0-AB91-06778B8BBAF3" | \
  gcloud secrets create tte-api-key --data-file=-

echo -n "5R97s?fDeUet5JzWY6fCAs5irCn" | \
  gcloud secrets create tte-api-password --data-file=-

# If using Upstash Redis with password
echo -n "YOUR_UPSTASH_PASSWORD" | \
  gcloud secrets create redis-password --data-file=-
```

### 2. Grant Secret Access to Cloud Run

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Grant secret accessor role for each secret
for SECRET in jwt-secret database-url redis-host tte-api-key tte-api-password; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# If using Upstash with password
gcloud secrets add-iam-policy-binding redis-password \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Verify Secrets

```bash
# List all secrets
gcloud secrets list

# View secret value (for testing)
gcloud secrets versions access latest --secret=jwt-secret
```

---

## Cloud Build Setup

### 1. Connect GitHub Repository

#### Method 1: GCP Console (Recommended)

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"Connect Repository"**
3. Select **"GitHub"** and authorize
4. Select your repository: `finalthreecon`
5. Click **"Connect"**

#### Method 2: CLI (Alternative)

```bash
# Install GitHub App and follow instructions
gcloud alpha builds connections create github finalthreecon-connection \
  --region=$REGION
```

### 2. Update cloudbuild.yaml

Before creating the trigger, update `suggestion/backend/cloudbuild.yaml`:

```yaml
# Line 66: Update CORS_ORIGIN to your Vercel frontend URL
- '--set-env-vars=NODE_ENV=production,PORT=8080,...,CORS_ORIGIN=https://YOUR-VERCEL-URL.vercel.app'
```

### 3. Create Cloud Build Trigger

```bash
gcloud builds triggers create github \
  --name=finalthreecon-backend-deploy \
  --repo-name=finalthreecon \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=suggestion/backend/cloudbuild.yaml \
  --included-files="suggestion/backend/**"
```

### 4. Manual First Build (Optional)

```bash
# Trigger a manual build to test
gcloud builds submit \
  --config=suggestion/backend/cloudbuild.yaml \
  --substitutions=BRANCH_NAME=main,COMMIT_SHA=$(git rev-parse HEAD) \
  suggestion/backend/
```

**Expected time**: 5-10 minutes for first build

---

## Frontend Deployment (Vercel)

### 1. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `finalthreecon`
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `suggestion/frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

### 2. Configure Environment Variables

In Vercel project settings → Environment Variables:

```bash
# Wait for Cloud Run API deployment to complete, then get the URL:
API_URL=$(gcloud run services describe finalthreecon-api \
  --region=$REGION \
  --format="value(status.url)")

echo "Your Cloud Run API URL: ${API_URL}"
```

Add to Vercel:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://finalthreecon-api-XXXXXX-uc.a.run.app/api` | Production, Preview |

### 3. Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Copy your Vercel URL (e.g., `https://finalthreecon.vercel.app`)

### 4. Update Backend CORS

Update Cloud Run API service with Vercel URL:

```bash
# Update CORS_ORIGIN environment variable
gcloud run services update finalthreecon-api \
  --region=$REGION \
  --update-env-vars=CORS_ORIGIN=https://YOUR-VERCEL-URL.vercel.app
```

---

## Initial Database Migration

### 1. Run Migrations via Cloud SQL Proxy

```bash
# Install Cloud SQL Proxy
# Download from: https://cloud.google.com/sql/docs/mysql/sql-proxy

# Start proxy (in separate terminal)
./cloud-sql-proxy ${PROJECT_ID}:${REGION}:finalthreecon-db

# In another terminal, run migrations
cd suggestion/backend

# Set database URL
export DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/clocktower_production"

# Run Prisma migrations
npx prisma migrate deploy

# Seed initial admin user
npx prisma db seed
```

### 2. Verify Database

```bash
# Connect to database
mysql -h 127.0.0.1 -u root -p clocktower_production

# Check tables
SHOW TABLES;

# Check admin user
SELECT email, role FROM users;

# Exit
exit;
```

---

## Testing

### 1. Test Backend API

```bash
# Get Cloud Run API URL
API_URL=$(gcloud run services describe finalthreecon-api \
  --region=$REGION \
  --format="value(status.url)")

# Test health endpoint
curl ${API_URL}/health

# Expected: {"status":"ok","timestamp":"2025-..."}
```

### 2. Test Frontend

1. Go to your Vercel URL
2. Try logging in with seeded admin user
3. Test syncing data from TTE API
4. Verify events, badges, etc. appear

### 3. Monitor Logs

```bash
# View Cloud Run API logs
gcloud run services logs read finalthreecon-api \
  --region=$REGION \
  --limit=50 \
  --format=json

# View Cloud Run Worker logs
gcloud run services logs read finalthreecon-worker \
  --region=$REGION \
  --limit=50 \
  --format=json

# View Cloud Build logs
gcloud builds list --limit=5
```

---

## Cost Management

### Free Tier Credits

- **New GCP accounts**: $300 free credits (3 months)
- Use this time to experiment and learn!

### Monthly Cost Breakdown (After Credits)

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| Cloud Run API | 512Mi RAM, scale-to-zero | $5-10 |
| Cloud Run Worker | 512Mi RAM, min 1 instance | $5-8 |
| Cloud SQL MySQL | db-f1-micro, 10GB | $10 |
| Memorystore Redis | 1GB Basic | $12-15 |
| VPC Connector | 2-3 instances | $8-10 |
| Secret Manager | 6 secrets | <$1 |
| **Total** | | **$40-55/month** |

### Cost Optimization Tips

#### Use Upstash Redis (Save $12-15/month)

Replace Memorystore with free Upstash Redis:
- **Savings**: $12-15/month
- **New Total**: $25-30/month

#### Use Cloud Run v2 with Direct VPC Egress

Update to Cloud Run v2 to eliminate VPC Connector cost:
- **Savings**: $8-10/month
- **Requires**: Cloud Run API v2 migration

#### Scale Down During Low Usage

```bash
# Reduce worker instances to 0 during off-hours
gcloud run services update finalthreecon-worker \
  --region=$REGION \
  --min-instances=0
```

### Monitoring Costs

```bash
# View current month billing
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID

# Set up budget alerts in GCP Console
# Billing → Budgets & Alerts → Create Budget
```

**Recommendation**: Set a $50/month budget alert to avoid surprises.

---

## Troubleshooting

### Cloud Run Service Won't Start

**Symptom**: Deployment succeeds but service shows errors

**Solution**:

```bash
# Check logs for errors
gcloud run services logs read finalthreecon-api --region=$REGION --limit=100

# Common issues:
# 1. Missing secrets - verify all secrets exist and have correct IAM bindings
# 2. Database connection - check Cloud SQL private IP and VPC connector
# 3. Redis connection - verify Redis host and port
```

### Database Connection Errors

**Symptom**: `Can't connect to MySQL server` errors

**Solution**:

```bash
# Verify Cloud SQL instance is running
gcloud sql instances list

# Check VPC connector status
gcloud compute networks vpc-access connectors describe finalthreecon-connector --region=$REGION

# Test connection from Cloud Run
gcloud run services update finalthreecon-api \
  --region=$REGION \
  --vpc-connector=finalthreecon-connector \
  --vpc-egress=private-ranges-only
```

### Prisma Migration Fails

**Symptom**: Cloud Build migration step fails

**Solution**:

```bash
# Run migrations manually via Cloud SQL Proxy
./cloud-sql-proxy ${PROJECT_ID}:${REGION}:finalthreecon-db

# In another terminal
export DATABASE_URL="mysql://root:PASSWORD@127.0.0.1:3306/clocktower_production"
npx prisma migrate deploy
```

### CORS Errors from Frontend

**Symptom**: Browser console shows CORS policy errors

**Solution**:

```bash
# Update CORS_ORIGIN to match your Vercel URL exactly
gcloud run services update finalthreecon-api \
  --region=$REGION \
  --update-env-vars=CORS_ORIGIN=https://your-exact-vercel-url.vercel.app

# Check backend logs to see which origin was blocked
gcloud run services logs read finalthreecon-api --region=$REGION
```

### Worker Not Processing Jobs

**Symptom**: Sync jobs stay in "pending" status

**Solution**:

```bash
# Check worker logs
gcloud run services logs read finalthreecon-worker --region=$REGION

# Verify worker is running in WORKER_ONLY mode
gcloud run services describe finalthreecon-worker --region=$REGION \
  --format="value(spec.template.spec.containers[0].env)"

# Restart worker
gcloud run services update finalthreecon-worker --region=$REGION
```

### High Costs / Unexpected Charges

**Symptom**: Bill higher than expected

**Solution**:

```bash
# Check Cloud Run invocations
gcloud run services metrics list finalthreecon-api --region=$REGION

# Check VPC connector usage (most common culprit)
gcloud compute networks vpc-access connectors describe finalthreecon-connector \
  --region=$REGION

# Consider switching to Upstash Redis to save $12-15/month
# Consider reducing worker min-instances to 0 during off-hours
```

---

## Useful Commands

### View All Services

```bash
# Cloud Run services
gcloud run services list --region=$REGION

# Cloud SQL instances
gcloud sql instances list

# Redis instances
gcloud redis instances list --region=$REGION

# Secrets
gcloud secrets list

# VPC connectors
gcloud compute networks vpc-access connectors list --region=$REGION
```

### Update Environment Variables

```bash
# Update single env var
gcloud run services update finalthreecon-api \
  --region=$REGION \
  --update-env-vars=KEY=VALUE

# Update multiple env vars
gcloud run services update finalthreecon-api \
  --region=$REGION \
  --update-env-vars=KEY1=VALUE1,KEY2=VALUE2
```

### Scale Services

```bash
# Update API service scaling
gcloud run services update finalthreecon-api \
  --region=$REGION \
  --min-instances=0 \
  --max-instances=20

# Update worker service scaling
gcloud run services update finalthreecon-worker \
  --region=$REGION \
  --min-instances=1 \
  --max-instances=5
```

### Rollback Deployment

```bash
# List revisions
gcloud run revisions list --service=finalthreecon-api --region=$REGION

# Rollback to previous revision
gcloud run services update-traffic finalthreecon-api \
  --region=$REGION \
  --to-revisions=REVISION_NAME=100
```

---

## Next Steps

After successful deployment:

1. **Set up monitoring**: Configure Cloud Monitoring dashboards
2. **Enable logging**: Set up log-based metrics and alerts
3. **Performance tuning**: Optimize Cloud Run concurrency and memory
4. **Security hardening**: Review IAM permissions, enable Audit Logs
5. **Backup strategy**: Configure automated Cloud SQL backups
6. **Domain setup**: Add custom domain to Vercel and Cloud Run
7. **SSL/TLS**: Verify HTTPS is enforced everywhere

---

## Support

- **GCP Documentation**: https://cloud.google.com/docs
- **Cloud Run**: https://cloud.google.com/run/docs
- **Cloud SQL**: https://cloud.google.com/sql/docs
- **Vercel Docs**: https://vercel.com/docs

---

## License

MIT License - See repository for details
