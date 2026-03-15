# EnergiX - Energy-as-a-Service Platform

A production-grade, full-stack Energy-as-a-Service (EaaS) platform with microservices architecture, real-time telemetry, and comprehensive energy management capabilities.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐                                                            │
│  │  React Web  │                                                            │
│  │  (Vite)     │                                                            │
│  └──────┬──────┘                                                            │
└─────────┼────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GATEWAY LAYER                                      │
│  ┌─────────────┐    ┌─────────────┐                                         │
│  │    Kong     │    │   NGINX     │                                         │
│  │  (API GW)   │    │  (Reverse)  │                                         │
│  └─────────────┘    └─────────────┘                                         │
└─────────┬────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MICROSERVICES LAYER                                  │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Auth    │ │  User    │ │   Sub    │ │  Billing │ │  Support │          │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │          │
│  │ (Node)   │ │ (Node)   │ │ (Node)   │ │ (Node)   │ │ (Node)   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │ Telemetry│ │ Telemetry│ │  DISCOM  │ │  DISCOM  │                       │
│  │  Ingest  │ │ Processor│ │  Adapter │ │ Simulator│                       │
│  │ (Node)   │ │ (Python) │ │ (Node)   │ │ (Node)   │                       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA & MESSAGING LAYER                              │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ MongoDB  │ │TimescaleDB│ │  Kafka   │ │   MQTT   │ │  MinIO   │          │
│  │ (Users,  │ │(Telemetry)│ │(Streaming)│ │ (IoT)   │ │  (S3)    │          │
│  │ Billing) │ │           │ │           │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Vite
- Recharts for data visualization
- Zustand for state management
- Axios for API calls

### Backend Services
- **Node.js/TypeScript**: Auth, User, Subscription, Billing, Support, DISCOM services
- **Python/FastAPI**: Telemetry processor
- **MQTT**: Eclipse Mosquitto for IoT messaging
- **Kafka**: Event streaming platform

### Data Layer
- **MongoDB**: Document store for users, plans, subscriptions, invoices, tickets
- **TimescaleDB**: Time-series database for energy telemetry
- **MinIO**: S3-compatible object storage for invoices and reports

### Infrastructure
- **Docker & Docker Compose**: Containerization
- **Kong**: API Gateway
- **NGINX**: Reverse proxy
- **Kubernetes**: Container orchestration (manifests included)

## Quick Start

### Prerequisites
- Git
- Docker 24.0+
- Docker Compose 2.20+ (or `docker compose` CLI)
- Node.js 20+ and npm (for frontend & Node services)
- Python 3.11+ and `pip` (for the telemetry processor)

### Clone the repository

```bash
git clone <repository-url>
cd energix
```

### Option A: Run full stack with Docker Compose

This is the easiest way to bring up all backing services (MongoDB, TimescaleDB, Kafka, MQTT, MinIO, Node microservices, Kong, NGINX, etc.).

```bash
cd infra

# Start everything in the background
docker-compose up -d

# Tail logs (optional)
docker-compose logs -f

# Stop and remove containers
docker-compose down
```

Once up, the main web app is typically exposed via NGINX/Kong at:

- `http://localhost` → EnergiX web UI

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost | Frontend application |
| Kong Gateway | http://localhost:8000 | API Gateway |
| Kong Admin | http://localhost:8001 | Kong Admin API |
| MongoDB | localhost:27017 | Database |
| TimescaleDB | localhost:5432 | Time-series database |
| Kafka | localhost:9092 | Message broker |
| MQTT | localhost:1883 | IoT messaging |
| MinIO | http://localhost:9000 | Object storage |
| MinIO Console | http://localhost:9002 | MinIO UI |

## Project Structure

```
energix/
├── apps/
│   └── web/                 # React frontend
├── services/
│   ├── auth-service/        # JWT authentication
│   ├── user-service/        # User management
│   ├── subscription-service/# Plans & subscriptions
│   ├── billing-service/     # Invoicing & payments
│   ├── telemetry-ingest/    # MQTT to Kafka bridge
│   ├── telemetry-processor/ # Kafka to TimescaleDB
│   ├── support-service/     # Ticketing system
│   ├── discom-adapter/      # DISCOM integration
│   └── discom-simulator/    # Mock DISCOM service
├── packages/
│   └── shared-types/        # Common TypeScript types
├── infra/
│   ├── docker-compose.yml   # Local orchestration
│   ├── kong/                # Kong configuration
│   ├── nginx/               # NGINX configuration
│   ├── k8s/                 # Kubernetes manifests
│   └── terraform/           # Infrastructure as Code
├── scripts/
│   ├── device-simulator/    # IoT device simulator
│   └── seed-data/           # Database seeding
└── docs/
    ├── architecture.md      # Architecture documentation
    ├── api-spec.md          # API specifications
    └── demo-flow.md         # Demo walkthrough
```

## Authentication

The platform uses JWT-based authentication:
- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: HTTP-only cookie (7 days)
- **Password Hashing**: bcrypt
- **OAuth**: Google Sign-In supported

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Email/password registration |
| POST | /auth/login | Email/password login |
| POST | /auth/google | Google OAuth login |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout user |

## API Documentation

### Core Services

| Service | Port | Base Path |
|---------|------|-----------|
| Auth Service | 3001 | /auth |
| User Service | 3002 | /users |
| Subscription Service | 3003 | /plans, /subscriptions, /devices |
| Billing Service | 3004 | /invoices, /payments |
| Telemetry Ingest | 3005 | - |
| Telemetry Processor | 3006 | /api/v1/telemetry |
| Support Service | 3007 | /tickets |
| DISCOM Adapter | 3008 | /discom |
| DISCOM Simulator | 3009 | /api |

## Telemetry Pipeline

```
Device Simulator → MQTT → Kafka → FastAPI Processor → TimescaleDB
```

The telemetry pipeline processes real-time energy data:
1. **Device Simulator** publishes metrics to MQTT topics
2. **Telemetry Ingest** service forwards MQTT messages to Kafka
3. **Telemetry Processor** (FastAPI) consumes from Kafka and stores in TimescaleDB
4. **Dashboard** queries aggregated data for visualization
 
## Local Development

### 1. Environment variables

Each backend service ships with an `.env.example`. Copy and adjust them before running locally:

```bash
# Auth service
cp services/auth-service/.env.example services/auth-service/.env

# User, Subscription, Billing, Support, DISCOM, Telemetry, etc.
cp services/user-service/.env.example services/user-service/.env
cp services/subscription-service/.env.example services/subscription-service/.env
cp services/billing-service/.env.example services/billing-service/.env
cp services/support-service/.env.example services/support-service/.env
cp services/discom-adapter/.env.example services/discom-adapter/.env
cp services/discom-simulator/.env.example services/discom-simulator/.env
cp services/telemetry-ingest/.env.example services/telemetry-ingest/.env
cp services/telemetry-processor/.env.example services/telemetry-processor/.env
```

Key things to verify in each `.env`:
- MongoDB / TimescaleDB connection strings
- Kafka / MQTT bootstrap URLs
- JWT secrets and token expiry
- External service URLs (Kong, DISCOM simulator, etc.)

> For a quick prototype/demo, the default `.env.example` values are usually enough when running via `infra/docker-compose.yml`.

### 2. Install dependencies

Install dependencies for the services you want to run locally:

```bash
# Example: auth service
cd services/auth-service
npm install

# Example: user service
cd ../user-service
npm install

# Example: React web app
cd ../../apps/web
npm install
```

For the Python telemetry processor:

```bash
cd services/telemetry-processor
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run services locally

You can run individual services in dev mode while still using Docker for infra (MongoDB, TimescaleDB, Kafka, etc.).

```bash
# In one terminal, bring up infra (databases, Kafka, etc.)
cd infra
docker-compose up -d

# In another terminal, run a Node service in dev mode
cd services/auth-service
npm run dev

# Example: run the React web app (Vite dev server)
cd apps/web
npm run dev
# Then open http://localhost:5173
```

To run the telemetry processor locally:

```bash
cd services/telemetry-processor
source .venv/bin/activate       # On Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 3006
```

## Checks & Quality Gates

### Linting & Tests for Node.js services

Most Node-based services (e.g. `auth-service`, `user-service`, `subscription-service`, etc.) expose common scripts:

```bash
cd services/auth-service

# Run unit tests
npm test

# Run lint checks
npm run lint
```

Repeat similarly for other services:

```bash
cd services/user-service
npm test
npm run lint
```

### Frontend checks (React web app)

```bash
cd apps/web

# Typecheck + production build
npm run build

# Preview the production build
npm run preview
```

### Python service checks

For the telemetry processor, you can at minimum verify that dependencies and the app start correctly:

```bash
cd services/telemetry-processor
source .venv/bin/activate       # On Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 3006
```

If you add tests (e.g. with `pytest`), run:

```bash
pytest
```

## Deployment

### Docker Compose (Production)

```bash
cd infra
docker-compose -f docker-compose.yml up -d
```

### Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f infra/k8s/
```

## Monitoring & Observability

Each service exposes:
- **Health endpoints**: `/health`, `/health/ready`, `/health/live`
- **Prometheus metrics**: `/metrics`
- **Structured logging**: JSON format

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@energix.com or create a ticket in the platform.
