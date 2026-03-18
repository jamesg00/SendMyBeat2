# Deployment Guide: Self-Hosted Setup on Amazon Lightsail

This guide will help you deploy your entire application (Frontend + Backend + Database) on a single Amazon Lightsail instance. For production use, the recommended baseline is the $12/month plan instead of the old low-memory tier.

## Prerequisites
- An AWS Account
- A domain name (optional, but recommended)
- Your Grok/xAI API Key (for cheap AI)

---

## Step 1: Create Your Lightsail Instance

1. Log in to [AWS Lightsail Console](https://lightsail.aws.amazon.com/).
2. Click **Create instance**.
3. Select **Linux/Unix** platform.
4. Select **OS Only** -> **Ubuntu 22.04 LTS**.
5. Scroll down to "Choose your instance plan".
6. Select at least the **$12 USD/month** plan.
7. Recommended baseline: **2 GB RAM, 2 vCPU, 60 GB SSD** or better for production traffic and job processing.
8. Name your instance (e.g., `sendmybeat-server`) and create it.

## Step 2: Configure Networking (Open Ports)

1. Click on your new instance name.
2. Go to the **Networking** tab.
3. Under "IPv4 Firewall", add two new rules:
   - Application: **Custom**, Protocol: **TCP**, Port: **8000** (Backend API)
   - Application: **Custom**, Protocol: **TCP**, Port: **3000** (Frontend App)
   - (Keep SSH port 22 open)
4. Click **Create static IP** (optional but recommended) and attach it to your instance so the IP doesn't change.

## Step 3: Connect & Install Docker

1. Click "Connect using SSH" (orange button) or use your own SSH client.
2. Once connected, run these commands to install Docker:

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Add your user to docker group (so you don't need sudo for docker commands)
sudo usermod -aG docker $USER
```

3. **Important:** Log out and log back in for the group changes to take effect.
   - Or run: `newgrp docker`

## Step 4: Clone Your Code

1. Clone your repository (replace with your actual repo URL):
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git app
   cd app
   ```

## Step 5: Configure Environment Variables

You need to set up the configuration files.

### Backend Configuration
1. Copy the example file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Edit the file:
   ```bash
   nano backend/.env
   ```
3. Fill in your keys (use the ones you saved!):
   - `GROK_API_KEY`: Paste your xAI API key here.
   - `LLM_PROVIDER`: Ensure it is set to `grok`.
   - `MONGO_URL`: **Set this to `mongodb://mongo:27017`** (this is CRITICAL for the free DB to work).
   - `BACKEND_URL`: Set to `https://api.sendmybeat.com` (or your backend domain).
   - `FRONTEND_URL`: Set to `https://sendmybeat.com` (or your frontend domain).
   - `CORS_ORIGINS`: Set to `*` (or your frontend domain).
   - Save and exit (Ctrl+X, Y, Enter).

### Frontend Configuration
1. Copy the example file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
2. Edit the file:
   ```bash
   nano frontend/.env
   ```
3. Add the backend URL (replace with your server's domain/IP):
   ```
   REACT_APP_BACKEND_URL=https://api.sendmybeat.com
   ```
   *(For compatibility, the frontend also accepts `REACT_APP_API_BASE_URL`, but `REACT_APP_BACKEND_URL` is the primary variable. If you haven't set up a custom domain for the backend yet, use `http://YOUR_STATIC_IP:8000`)*

3. Save and exit.

## Step 6: Launch Everything!

Run this single command to build and start all services (Backend, Frontend, Database):

```bash
docker compose up -d --build
```

- This will download MongoDB, build your backend, build your frontend, and start them all.
- If you change `frontend/.env`, rebuild the frontend container because React embeds env vars at build time.
- It might take 5-10 minutes the first time.

## Step 7: Access Your Site

- **Frontend:** `http://YOUR_STATIC_IP:3000` (or `https://sendmybeat.com` if configured)
- **Backend API:** `http://YOUR_STATIC_IP:8000` (or `https://api.sendmybeat.com` if configured)
- **Admin Cost Tracker:** Go to `/admin/costs` on your site (login required).

## HTTPS Setup (Optional but Recommended)
If you want the secure lock icon (`https://`), you can use **Caddy** to automatically handle SSL certificates.

1. Create a `Caddyfile` in your project root:
   ```bash
   nano Caddyfile
   ```
2. Paste this configuration (replace with your actual domains):
   ```
   sendmybeat.com {
       reverse_proxy frontend:3000
   }

   api.sendmybeat.com {
       reverse_proxy backend:8000
   }
   ```
3. Run Caddy with Docker:
   ```bash
   docker run -d --name caddy --network app_default -p 80:80 -p 443:443 -v $PWD/Caddyfile:/etc/caddy/Caddyfile -v caddy_data:/data caddy:alpine
   ```

## Troubleshooting & Maintenance

- **View Logs:**
  ```bash
  docker compose logs -f
  ```
- **Stop Everything:**
  ```bash
  docker compose down
  ```
- **Update Code:**
  ```bash
  git pull
  docker compose up -d --build
  ```

## Cost Savings
- **Database:** Free (Self-hosted on same server)
- **Backend:** Included in server cost (example baseline: $12/mo)
- **AI:** Pay-per-use (Grok is much cheaper than GPT-4)
- **Total:** ~$12/mo + AI usage.

Enjoy your low-cost setup! 🚀
