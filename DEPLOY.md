# Deployment Guide: Free Self-Hosted Setup on Amazon Lightsail

This guide will help you deploy your entire application (Frontend + Backend + Database) on a single $3.50/month Amazon Lightsail instance. This eliminates MongoDB Atlas costs and keeps everything under one cheap bill.

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
6. Select the **$3.50 USD/month** plan (512 MB RAM, 1 vCPU, 20 GB SSD).
7. Name your instance (e.g., `sendmybeat-server`) and create it.

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

## Step 4: Clone Your Code & Setup Swap

1. Clone your repository (replace with your actual repo URL):
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git app
   cd app
   ```

2. **Crucial:** Run the swap setup script to prevent out-of-memory errors during build:
   ```bash
   sudo chmod +x scripts/setup_swap.sh
   sudo ./scripts/setup_swap.sh
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
1. Create a frontend env file:
   ```bash
   nano frontend/.env
   ```
2. Add the backend URL (replace with your server's domain/IP):
   ```
   REACT_APP_BACKEND_URL=https://api.sendmybeat.com
   ```
   *(Note: If you haven't set up a custom domain for the backend yet, use `http://YOUR_STATIC_IP:8000`)*

3. Save and exit.

## Step 6: Launch Everything!

Since we are on a low-memory instance, we should build services one by one to avoid crashing the server.

1. Build the Backend:
   ```bash
   docker compose build backend
   ```

2. Build the Frontend (this takes the longest):
   ```bash
   docker compose build frontend
   ```

3. Start everything:
   ```bash
   docker compose up -d
   ```

- This process might take 10-15 minutes the first time.

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

- **Build Fails / "Connection Reset" / "Killed":**
  - This means your server ran out of memory.
  - **Ensure you ran the swap script** (Step 4.2).
  - **Ensure you are building sequentially** (Step 6).
  - Try restarting Docker: `sudo systemctl restart docker`.

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
  # Build individually again
  docker compose build backend
  docker compose build frontend
  docker compose up -d
  ```

## Cost Savings
- **Database:** Free (Self-hosted on same server)
- **Backend:** Included in server cost ($3.50/mo)
- **AI:** Pay-per-use (Grok is much cheaper than GPT-4)
- **Total:** ~$3.50/mo + minimal AI usage.

Enjoy your low-cost setup! 🚀
