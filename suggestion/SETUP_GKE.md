# GKE Setup Guide

Step-by-step instructions to provision the GKE infrastructure and deploy the backend for the first time. Run these commands from your local machine with `gcloud` installed and authenticated.

## Why GKE instead of Cloud Run?

Cloud Run can't reach **Cloud Memorystore Redis** over a private VPC connection without a Serverless VPC Connector, and that connector was causing TCP timeout errors with Upstash. GKE runs inside the VPC natively, so both Cloud SQL and Cloud Memorystore are reachable over private IPs — no tunneling, no timeouts.

---

## Prerequisites

```bash
# Authenticate
gcloud auth login
gcloud auth application-default login

# Set your project (use the existing finalthreecon-prod project)
export PROJECT_ID="finalthreecon-prod"
export REGION="us-central1"
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
```

---

## Step 1 — Enable Required APIs

```bash
gcloud services enable \
  container.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  sqladmin.googleapis.com
```

These may already be enabled from the Cloud Run setup — running the command again is safe.

---

## Step 2 — Create the GKE Autopilot Cluster

**Autopilot** means Google manages the underlying nodes for you — you only think about pods and deployments.

```bash
gcloud container clusters create-auto finalthreecon-cluster \
  --region=$REGION \
  --network=default \
  --project=$PROJECT_ID
```

This takes about 5 minutes. You'll see a progress indicator. When it finishes, configure `kubectl` to talk to it:

```bash
gcloud container clusters get-credentials finalthreecon-cluster \
  --region=$REGION \
  --project=$PROJECT_ID

# Verify — should show the cluster nodes
kubectl get nodes
```

---

## Step 3 — Create Cloud Memorystore Redis

This replaces Upstash and solves the TCP timeout issue. The instance runs inside the same VPC as the GKE cluster, so the connection is pure private networking.

```bash
gcloud redis instances create finalthreecon-redis \
  --size=1 \
  --region=$REGION \
  --tier=basic \
  --network=default \
  --project=$PROJECT_ID
```

This takes about 5 minutes. Once done, get the private IP:

```bash
gcloud redis instances describe finalthreecon-redis \
  --region=$REGION \
  --format="value(host)"
# Example output: 10.184.11.3
# Save this IP — you need it in Step 4
```

**Cost**: ~$12–15/month for 1 GB Basic tier.

---

## Step 4 — Update Secrets in Secret Manager

The `redis-host` secret needs to point to the Memorystore private IP you just found. If the secret doesn't exist yet, create it:

```bash
REDIS_PRIVATE_IP="<IP from Step 3>"

# Update existing secret (or create if missing)
echo -n "$REDIS_PRIVATE_IP" | gcloud secrets versions add redis-host --data-file=- 2>/dev/null || \
  echo -n "$REDIS_PRIVATE_IP" | gcloud secrets create redis-host --data-file=-

# Cloud Memorystore Basic tier has no auth password — set an empty value
echo -n "" | gcloud secrets versions add redis-password --data-file=- 2>/dev/null || \
  echo -n "" | gcloud secrets create redis-password --data-file=-
```

If you're starting from scratch and also need to create the other secrets:

```bash
# Database URL (Cloud SQL private IP — already exists from Cloud Run setup)
# Only run if the secret doesn't already exist:
# echo -n "mysql://root:PASSWORD@CLOUD_SQL_IP:3306/clocktower_production" | \
#   gcloud secrets create database-url --data-file=-

# Verify all required secrets exist
gcloud secrets list --filter="name:(database-url OR redis-host OR redis-password OR jwt-secret OR tte-api-key OR tte-api-password)"
```

---

## Step 5 — Authorize Cloud Build to Deploy to GKE

Cloud Build needs permission to call `kubectl` against your cluster.

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Allow Cloud Build to get cluster credentials
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/container.developer"

# Allow Cloud Build to read secrets from Secret Manager
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 6 — Create the Cloud Build Trigger

Point the trigger at `cloudbuild-gke.yaml` instead of the old `cloudbuild.yaml`.

```bash
gcloud builds triggers create github \
  --name=finalthreecon-backend-gke \
  --repo-name=finalthreecon \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=suggestion/backend/cloudbuild-gke.yaml \
  --included-files="suggestion/backend/**"
```

> **Note:** The old Cloud Run trigger (`finalthreecon-backend-deploy`) can stay disabled until you're ready to fully switch over.

---

## Step 7 — First Deploy

### Option A — Trigger via Cloud Build (recommended)

Push a commit to `main` that touches anything under `suggestion/backend/`. The build will:
1. Build and push the Docker image
2. Sync secrets from Secret Manager into a K8s Secret
3. Apply all manifests from `k8s/`
4. Wait for rollouts to complete

Watch progress:
```bash
gcloud builds list --limit=5
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

### Option B — Apply manifests manually (first-time only)

```bash
cd /path/to/finalthreecon

# Create the namespace first
kubectl apply -f suggestion/backend/k8s/namespace.yaml

# Create the K8s secret from Secret Manager values
DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url --project=$PROJECT_ID)
REDIS_HOST=$(gcloud secrets versions access latest --secret=redis-host --project=$PROJECT_ID)
REDIS_PASSWORD=$(gcloud secrets versions access latest --secret=redis-password --project=$PROJECT_ID)
JWT_SECRET=$(gcloud secrets versions access latest --secret=jwt-secret --project=$PROJECT_ID)
TTE_API_KEY=$(gcloud secrets versions access latest --secret=tte-api-key --project=$PROJECT_ID)
TTE_API_PASSWORD=$(gcloud secrets versions access latest --secret=tte-api-password --project=$PROJECT_ID)

kubectl create secret generic finalthreecon-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=REDIS_HOST="$REDIS_HOST" \
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=TTE_API_KEY="$TTE_API_KEY" \
  --from-literal=TTE_API_PASSWORD="$TTE_API_PASSWORD" \
  --namespace=finalthreecon \
  --dry-run=client -o yaml | kubectl apply -f -

# Replace placeholders with real values, then apply
IMAGE="gcr.io/$PROJECT_ID/finalthreecon-backend:latest"
sed "s|gcr.io/PROJECT_ID/finalthreecon-backend:IMAGE_TAG|$IMAGE|g" \
  suggestion/backend/k8s/api-deployment.yaml | kubectl apply -f -
sed "s|gcr.io/PROJECT_ID/finalthreecon-backend:IMAGE_TAG|$IMAGE|g" \
  suggestion/backend/k8s/worker-deployment.yaml | kubectl apply -f -
kubectl apply -f suggestion/backend/k8s/configmap.yaml
kubectl apply -f suggestion/backend/k8s/api-service.yaml
kubectl apply -f suggestion/backend/k8s/api-hpa.yaml
```

---

## Step 8 — Verify the Deployment

```bash
# All pods should show Running
kubectl get pods -n finalthreecon

# Get the external IP of the LoadBalancer (may take 1–2 minutes to provision)
kubectl get service finalthreecon-api -n finalthreecon
# Look for EXTERNAL-IP — initially shows <pending>, then an IP like 34.XX.XX.XX

# Hit the health endpoint
curl http://<EXTERNAL-IP>/health
# Expected: {"status":"ok","timestamp":"..."}

# Check HPA is watching
kubectl get hpa -n finalthreecon

# Tail API logs
kubectl logs -n finalthreecon deployment/finalthreecon-api -f

# Tail worker logs
kubectl logs -n finalthreecon deployment/finalthreecon-worker -f
```

---

## Step 9 — Update Frontend CORS

Once you have the LoadBalancer IP, update the `CORS_ORIGIN` in the ConfigMap if it's currently pointing at Cloud Run:

```bash
# Edit configmap.yaml locally, then apply
kubectl apply -f suggestion/backend/k8s/configmap.yaml

# Restart pods to pick up the change
kubectl rollout restart deployment/finalthreecon-api -n finalthreecon
```

And update your Vercel environment variable `VITE_API_URL` to `http://<EXTERNAL-IP>/api`.

---

## Cost Estimate (After Free Credits)

| Service | Config | Est./month |
|---------|--------|-----------|
| GKE Autopilot (2 API + 1 Worker pods) | ~0.25 vCPU total | $5–10 |
| Cloud SQL MySQL | db-f1-micro | $10 |
| Cloud Memorystore Redis | 1 GB Basic | $12–15 |
| Cloud Build | ~10 builds/month | <$1 |
| **Total** | | **~$27–36/month** |

This is less than the Cloud Run setup because you no longer need the VPC Connector ($8–10/month).

---

## Useful Day-to-Day Commands

```bash
# View all resources in the namespace
kubectl get all -n finalthreecon

# Describe a pod (shows events, useful for debugging startup failures)
kubectl describe pod -n finalthreecon -l app=finalthreecon-api

# Manually trigger a rollout (e.g. to pick up a config change)
kubectl rollout restart deployment/finalthreecon-api -n finalthreecon

# Scale the worker up/down manually
kubectl scale deployment finalthreecon-worker --replicas=2 -n finalthreecon

# View recent events in the namespace
kubectl get events -n finalthreecon --sort-by='.lastTimestamp'
```
