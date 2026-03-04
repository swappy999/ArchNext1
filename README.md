# ArchNext

ArchNext is an elite, hybrid-blockchain property marketplace integrating AI-verified pricing models, Polygon/Algorand smart contracts, and high-fidelity 3D map visualization.

## Architecture
- **Frontend:** Next.js 14, React 19, Tailwind CSS, Web3Modal, Deck.gl, Three.js
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, Web3.py
- **Smart Contracts:** Solidity (Deployed to Polygon Amoy Testnet)

## Setup Instructions

### 1. Prerequisites
- **Node.js:** v20.x or v22.x
- **Python:** v3.12.x
- **PostgreSQL:** Running locally or via Supabase
- **MetaMask:** Browser extension configured for Polygon Amoy

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/scripts/activate  # On Windows
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory (see `backend/.env.example`).

To initialize the database and start the server:
```bash
python scripts/seed_full_flow.py
uvicorn app.main:app --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory (see `frontend/.env.example`).

To start the development server:
```bash
npm run dev
```

### 4. Build for Production
The frontend is configured for a standalone output.
```bash
cd frontend
npm run build
```

## Key Features
- **AI Valuation:** Predictive pricing powered by structural and localized geo-data.
- **Hybrid Blockchain:** Assets exist as NFTs on Polygon but can be transacted directly via the backend if on-chain execution is deferred.
- **3D Spatial Discovery:** Next-gen WebGL property map visualization.
- **Role-Based Portfolios:** Direct ownership tracking leveraging wallet addresses and JWTs.

## DigitalOcean / Docker Deployment
ArchNext is pre-configured for easy deployment using Docker Compose. It works out-of-the-box on DigitalOcean Droplets.

1. Clone the repository on your server.
2. Edit `backend/.env` and `frontend/.env.local` to fit your production credentials.
3. Build and launch the containers:
```bash
docker-compose up --build -d
```
The application will map to your droplet's IP address (`:3000` for frontend, `:8000` for backend APIs).