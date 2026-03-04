#!/bin/bash
# setup_droplet.sh
# Run this script on a fresh Ubuntu DigitalOcean Droplet to deploy ArchNext

echo "🚀 Starting ArchNext DigitalOcean Deployment Setup..."

# 1. Update the system
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker & Docker Compose
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
else
    echo "✅ Docker is already installed."
fi

# Install docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose is already installed."
fi

# 3. Clone Repository
echo "📥 Cloning ArchNext repository..."
if [ -d "ArchNext" ]; then
    echo "⚠️ ArchNext directory already exists. Pulling latest..."
    cd ArchNext
    git pull origin main
else
    git clone https://github.com/swappy999/test.git ArchNext
    cd ArchNext
fi

# 4. Set up Environment Variables (Interactive)
echo "⚙️ Setting up Environment Variables..."

if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from example..."
    cp backend/.env.example backend/.env
    echo "⚠️ IMPORTANT: Please edit backend/.env to add your API keys right after this script finishes."
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "Creating frontend/.env.local from example..."
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env.local
    fi
    # Get Droplet IP dynamically
    DROPLET_IP=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
    echo "NEXT_PUBLIC_API_URL=http://$DROPLET_IP:8000" > frontend/.env.local
    echo "✅ Auto-configured NEXT_PUBLIC_API_URL to point to Droplet IP: $DROPLET_IP"
fi

# 5. Build and Launch
echo "🏗️ Building and tearing up Docker containers..."
sudo docker-compose up --build -d

echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "🌍 Your Application is starting..."
echo "👉 Frontend (Web): http://$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)"
echo "👉 Backend (API):  http://$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address):8000/docs"
echo ""
echo "⚠️  NOTE: Don't forget to edit 'backend/.env' with your real secrets!"
echo "    Run: nano backend/.env"
echo "    Then restart containers: docker-compose restart"
echo "=========================================================="
