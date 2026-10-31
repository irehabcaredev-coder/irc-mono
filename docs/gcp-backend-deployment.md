# GCP Backend Deployment Guide (Compute Engine + Docker + Caddy)

This guide walks you through deploying the backend API (with embedded WebRTC signaling) onto a Google Cloud Compute Engine VM using the automated GitHub Actions CI/CD pipeline.

---

## 1. GCP Initial Setup (Console or Cloud Shell)

### A. Create an Artifact Registry Repository for Docker images
In GCP Cloud Shell:
```bash
# Set your variables
export PROJECT_ID=$(gcloud config get-value project)
export REGION="asia-south1"

# Enable required Google Cloud APIs
gcloud services enable \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com

# Create the Artifact Registry Docker repo
gcloud artifacts repositories create ecareplus \
  --repository-format=docker \
  --location=$REGION \
  --description="ECare+ Backend Docker repository"
```
### B. Create a Service Account for GitHub Actions
```bash
# Create service account
gcloud iam service-accounts create github-deployer \
  --description="Service account for GitHub Actions CI/CD" \
  --display-name="GitHub Deployer"

# Grant Artifact Registry Writer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Generate and download the JSON key
gcloud iam service-accounts keys create ~/gcp-sa-key.json \
  --iam-account="github-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Display the key content (copy this for GitHub Secret GCP_SA_KEY)
cat ~/gcp-sa-key.json
```

---

## 2. Provision the Compute Engine VM

### A. Create the VM
```bash
# Reserve a static external IP address
gcloud compute addresses create ecareplus-api-ip --region=$REGION

# Get the reserved IP
STATIC_IP=$(gcloud compute addresses describe ecareplus-api-ip --region=$REGION --format="value(address)")
echo "Reserved Static IP: $STATIC_IP"

# Create e2-small (or e2-medium) VM in Mumbai
gcloud compute instances create ecareplus-api-vm \
  --zone=${REGION}-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --address=$STATIC_IP \
  --tags=http-server,https-server \
  --scopes=cloud-platform
```

### B. Open Firewall Ports
Allow ports 80 (HTTP) and 443 (HTTPS) for Caddy:
```bash
gcloud compute firewall-rules create allow-http-https \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server,https-server
```

---

## 3. Configure the VM Instance

SSH into your new VM:
```bash
gcloud compute ssh ecareplus-api-vm --zone=${REGION}-a
```

Inside the VM terminal, run:
```bash
# 1. Update and install Docker + Docker Compose plugin
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git

# 2. Add current user to docker group
sudo usermod -aG docker $USER

# 3. Apply group changes
newgrp docker

# 4. Authenticate Docker with Google Artifact Registry
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet

# 5. Create deployment directory
sudo mkdir -p /opt/ecareplus
sudo chown -R $USER:$USER /opt/ecareplus

# 6. Create the production environment file
cat << 'EOF' > /opt/ecareplus/.env
API_IMAGE=asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/ecareplus/api:latest
API_DOMAIN=api.irehabcare.com

DATABASE_URL=your_postgresql_database_url
DIRECT_URL=your_postgresql_direct_url

JWT_SECRET=your_long_random_jwt_secret
JWT_EXPIRES_IN=7d
SESSION_SECRET=your_long_random_session_secret

BREVO_API_KEY=your_brevo_api_key
EMAIL_USER=noreply@irehabcare.com

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://api.irehabcare.com/auth/google/callback
FRONTEND_URL=https://irehabcare.com

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

OPENROUTER_API_KEY=your_openrouter_api_key
ADMIN_API_TOKEN=your_admin_api_token

NODE_ENV=production
PORT=8000
EOF

# Edit /opt/ecareplus/.env with your real credentials:
nano /opt/ecareplus/.env
```

---

## 4. SSH Key for GitHub Actions

On your local machine or Cloud Shell, generate a dedicated SSH keypair for GitHub Actions:
```bash
ssh-keygen -t ed25519 -C "github-actions-deployer" -f ~/.ssh/github_actions_deploy -N ""
```
1. Add the **Public Key** (`~/.ssh/github_actions_deploy.pub`) to the VM:
   - Paste the contents into `/home/USERNAME/.ssh/authorized_keys` on the VM.
2. The **Private Key** (`~/.ssh/github_actions_deploy`) will be saved in GitHub Secrets as `VM_SSH_KEY`.

---

## 5. Configure GitHub Repository Settings

Go to your repository on GitHub: **Settings > Secrets and variables > Actions**:

### Variables (`Repository Variables`)
| Name | Value |
| :--- | :--- |
| `GCP_PROJECT` | Your GCP Project ID |
| `GCP_REGION` | `asia-south1` |

### Secrets (`Repository Secrets`)
| Name | Description |
| :--- | :--- |
| `GCP_SA_KEY` | Paste the entire content of `gcp-sa-key.json` |
| `VM_HOST` | Static external IP of your VM (e.g., `34.x.x.x`) |
| `VM_USER` | Your SSH user on the VM (e.g. `ubuntu` or your username) |
| `VM_SSH_KEY` | Private SSH key (`~/.ssh/github_actions_deploy`) |

---

## 6. Point DNS to the VM Static IP

In your domain DNS manager (e.g. Cloudflare / Namecheap / GoDaddy):
- Add an **A Record**:
  - **Name / Host**: `api` (for `api.irehabcare.com`)
  - **Value / IPv4**: `<YOUR_STATIC_IP>`
  - **TTL**: Auto / 5 min
  - *(If using Cloudflare, set proxy status to **DNS only** initially so Let's Encrypt can issue the TLS cert seamlessly)*

---

## 7. Trigger Deployment

Push your code to the `prod` branch, or manually trigger the workflow from the **Actions** tab on GitHub:
- Workflow: **`deploy-api`** -> **Run workflow**.

The workflow will:
1. Build the API container with `pnpm build` & `prisma generate`.
2. Push the Docker image to Google Artifact Registry (`asia-south1-docker.pkg.dev/...`).
3. Copy `infra/docker-compose.yml` and `infra/caddy/Caddyfile` to `/opt/ecareplus` on the VM.
4. Run `prisma migrate deploy` database migrations.
5. Launch `api` and `caddy` via `docker compose up -d`.
6. Caddy automatically provisions a valid HTTPS certificate for `api.irehabcare.com`.
