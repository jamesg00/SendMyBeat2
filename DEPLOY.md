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
7. Name your instance (e.g., `my-beat-website`) and create it.

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
3. Fill in your keys:
   - `GROK_API_KEY`: Paste your xAI API key here.
   - `LLM_PROVIDER`: Ensure it is set to `grok`.
   - `MONGO_URL`: Leave as `mongodb://mongo:27017` (this points to the internal free DB).
   - `BACKEND_URL`: Set to `http://YOUR_SERVER_IP:8000`.
   - `FRONTEND_URL`: Set to `http://YOUR_SERVER_IP:3000`.
   - Save and exit (Ctrl+X, Y, Enter).

### Frontend Configuration
1. Create a frontend env file:
   ```bash
   nano frontend/.env
   ```
2. Add the backend URL (replace with your server's public IP):
   ```
   REACT_APP_BACKEND_URL=http://YOUR_SERVER_IP:8000
   ```
3. Save and exit.

## Step 6: Launch Everything!

Run this single command to build and start all services (Backend, Frontend, Database):

```bash
docker compose up -d --build
```

- This will download MongoDB, build your backend, build your frontend, and start them all.
- It might take 5-10 minutes the first time.

## Step 7: Access Your Site

- **Frontend:** `http://YOUR_SERVER_IP:3000`
- **Backend API:** `http://YOUR_SERVER_IP:8000`
- **Admin Cost Tracker:** Go to `http://YOUR_SERVER_IP:3000/admin/costs` (login required).

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
- **Backend:** Included in server cost ($3.50/mo)
- **AI:** Pay-per-use (Grok is much cheaper than GPT-4)
- **Total:** ~$3.50/mo + minimal AI usage.

Enjoy your low-cost setup! 🚀
