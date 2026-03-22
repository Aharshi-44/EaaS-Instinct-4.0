# EnergiX — Energy-as-a-Service Platform

A production-grade, full-stack Energy-as-a-Service (EaaS) platform with microservices architecture, real-time telemetry, and comprehensive energy management capabilities.

The **web app** (`apps/web`) is a React + TypeScript SPA using **Tailwind CSS** and **shadcn/ui**, with **Zustand** for auth state and **Recharts** for dashboard charts. It supports **demo mode** (localStorage-backed subscription, invoices, and fake checkout) when APIs are unavailable.

---

## How to run this project

Pick **one** path below. For most people, **Option A** is enough to see the UI working.

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | **v20+** (LTS recommended) — required for the web app |
| **npm** | Comes with Node |
| **Docker** + **Docker Compose** | Optional — only for full stack / databases |
| **Python 3.11+** | Optional — only if you run the telemetry processor locally |

---

### Option A — Frontend only (quickest)

Use this to run the React app with **Vite**. Demo flows (subscription, payment, ROI) work with **localStorage** even if no backend is running.

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd energix/apps/web
   npm install
   ```

2. **Start the dev server**

   ```bash
   npm run dev
   ```

3. **Open the app** in your browser at the URL Vite prints (usually **http://localhost:5173**).

4. **Sign up / log in** at `/signup` or `/login`, then use the sidebar (Dashboard, Subscription, ROI Calculator, etc.).

5. **Stop** the server with `Ctrl+C` in the terminal.

**Other useful commands** (from `apps/web`):

| Command | What it does |
|---------|----------------|
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally (often **http://localhost:4173**) |

---

### Option B — Full stack with Docker Compose

Starts infrastructure and services defined in **`infra/docker-compose.yml`** (databases, Kafka, MQTT, gateways, etc.).

1. **From the repo root:**

   ```bash
   cd infra
   docker compose up -d
   ```

2. **Check containers:** `docker compose ps`

3. **Logs (optional):** `docker compose logs -f`

4. **Stop everything:** `docker compose down`

The web UI is typically exposed through NGINX/Kong — often **http://localhost** (confirm ports in `infra/docker-compose.yml`).

---

### Option C — Mixed local dev (Docker infra + Node services + web app)

For backend development: run **databases/messaging** in Docker, then run **individual Node services** and the **web app** on your machine.

1. Start infra:

   ```bash
   cd infra
   docker compose up -d
   ```

2. Copy **`.env.example` → `.env`** for each service you run (see [Local development](#local-development)).

3. In separate terminals, install and start services you need, for example:

   ```bash
   cd services/auth-service
   npm install
   npm run dev
   ```

4. Run the frontend:

   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

5. Configure the frontend API base URL if your project uses **`VITE_*`** (or similar) env vars — see `apps/web` and `src/services`.

---

## Web application (React)

### Tech

| Layer | Choice |
|--------|--------|
| Framework | React 18, TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS, shadcn/ui (Radix), `tailwindcss-animate` |
| Routing | React Router v6 |
| HTTP | Axios |
| Charts | Recharts |

### Scripts (`apps/web`)

```bash
cd apps/web
npm install
npm run dev      # http://localhost:5173 (default Vite port)
npm run build    # tsc + vite build
npm run preview  # preview production build
```

### Routes

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Email/password login |
| `/signup` | Public | Registration |
| `/` | Private (layout) | **Dashboard** — realtime energy view, charts, alerts; gated without an active subscription (demo) |
| `/subscription` | Private | **Plans** — Basic / Pro / Premium cards, subscribe flow |
| `/roi-calculator` | Private | **ROI Calculator** — bill slider, savings estimate, recommended tier |
| `/billing` | Private | Billing / invoices (uses demo invoice after payment when applicable) |
| `/support` | Private | Support |
| `/admin` | Admin role | Admin area |
| `/payment` | Private | **Demo checkout** (full-width layout, outside main shell) |

**Notes**

- There is **no** `/dashboard` route: the dashboard is the **index** route **`/`**.
- `/plans` redirects to **`/subscription`**.

### User journeys

1. **ROI Calculator → Subscription**  
   After a positive savings estimate, **Continue with this Plan** saves `recommendedPlan` (`Basic` | `Pro` | `Premium`) to `localStorage` and navigates to `/subscription`. The matching plan card is highlighted and can show a short “based on your usage” hint.

2. **Subscribe → Payment → Subscription**  
   **Subscribe** navigates to `/payment` with `location.state`: `planId`, `planName`, `planPrice`.  
   After successful **demo** payment, the app returns to `/subscription` with the same state so the active plan can sync.  
   **Demo payment:** card `4111 1111 1111 1111`, any future expiry, CVV `123`, OTP `1234`.

3. **Dashboard access (demo)**  
   Without an active **demo** subscription for the logged-in user, the dashboard can show a locked / limited experience until the user completes the subscription + payment flow (per-user keys below).

### Client-side storage (demo / UX)

Values are best-effort; failures are ignored in try/catch.

| Key | Purpose |
|-----|---------|
| `recommendedPlan` | Plan name string from ROI; cleared after successful payment |
| `activePlan` | Last activated plan name (set after payment) |
| `selectedPlan` | JSON snapshot of selection (e.g. name, price, planId) |
| `energix-demo-subscription-{userId}` | Per-user demo subscription (`status: active`, plan metadata) |
| `energix-demo-invoice-{userId}` | Per-user demo invoice after fake payment |

Helpers live in `apps/web/src/lib/demoStorage.ts`.

### API usage

The frontend calls backend services via configured base URLs (see service `axios` / env patterns in `apps/web/src/services`). If requests fail (e.g. stack not running), **demo fallbacks** can apply for telemetry and related views.

---

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

---

## Tech Stack

### Frontend

- React 18 + TypeScript  
- Tailwind CSS + shadcn/ui  
- Vite  
- Recharts (dashboard charts)  
- Zustand (auth)  
- Axios  

### Backend services

- **Node.js / TypeScript**: Auth, User, Subscription, Billing, Support, DISCOM services  
- **Python / FastAPI**: Telemetry processor  
- **MQTT**: Eclipse Mosquitto for IoT messaging  
- **Kafka**: Event streaming  

### Data layer

- **MongoDB**: Users, plans, subscriptions, invoices, tickets  
- **TimescaleDB**: Energy telemetry time-series  
- **MinIO**: S3-compatible storage for invoices and reports  

### Infrastructure

- **Docker & Docker Compose**  
- **Kong** API Gateway  
- **NGINX** reverse proxy  
- **Kubernetes** manifests (`infra/k8s/`)  

---

## Quick reference (URLs & ports)

Step-by-step run instructions are in **[How to run this project](#how-to-run-this-project)** above.

When **Docker Compose** (`infra`) is up, common endpoints include:

| Service | URL | Description |
|---------|-----|-------------|
| Web app (via compose) | http://localhost | Often NGINX/Kong front door — check `infra/docker-compose.yml` |
| Kong Gateway | http://localhost:8000 | API Gateway |
| Kong Admin | http://localhost:8001 | Kong Admin API |
| MongoDB | localhost:27017 | Database |
| TimescaleDB | localhost:5432 | Time-series DB |
| Kafka | localhost:9092 | Broker |
| MQTT | localhost:1883 | IoT messaging |
| MinIO | http://localhost:9000 | Object storage |
| MinIO Console | http://localhost:9002 | MinIO UI |

**Vite dev server** (Option A): **http://localhost:5173** (or the port shown in the terminal).

---

## Project structure

```
energix/
├── apps/
│   └── web/                    # React + Vite frontend
├── services/
│   ├── auth-service/           # JWT authentication
│   ├── user-service/           # User management
│   ├── subscription-service/   # Plans & subscriptions
│   ├── billing-service/        # Invoicing & payments
│   ├── telemetry-ingest/       # MQTT → Kafka bridge
│   ├── telemetry-processor/    # Kafka → TimescaleDB (Python)
│   ├── support-service/        # Ticketing
│   ├── discom-adapter/         # DISCOM integration
│   └── discom-simulator/       # Mock DISCOM
├── packages/
│   └── shared-types/           # Shared TypeScript types
├── infra/
│   ├── docker-compose.yml      # Local orchestration
│   ├── kong/
│   ├── nginx/
│   ├── k8s/
│   └── terraform/
├── scripts/
│   ├── device-simulator/
│   └── seed-data/
└── docs/
    ├── architecture.md
    ├── api-spec.md
    └── demo-flow.md
```

---

## Authentication

JWT-based authentication:

- **Access token**: short-lived (~15 minutes)  
- **Refresh token**: HTTP-only cookie (~7 days)  
- **Password hashing**: bcrypt  
- **OAuth**: Google Sign-In (where configured)  

### Auth endpoints (reference)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Registration |
| POST | /auth/login | Login |
| POST | /auth/google | Google OAuth |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout |

---

## API documentation (services)

| Service | Port | Base path (typical) |
|---------|------|---------------------|
| Auth | 3001 | /auth |
| User | 3002 | /users |
| Subscription | 3003 | /plans, /subscriptions, /devices |
| Billing | 3004 | /invoices, /payments |
| Telemetry Ingest | 3005 | — |
| Telemetry Processor | 3006 | /api/v1/telemetry |
| Support | 3007 | /tickets |
| DISCOM Adapter | 3008 | /discom |
| DISCOM Simulator | 3009 | /api |

See `docs/api-spec.md` for details.

---

## Telemetry pipeline

```
Device Simulator → MQTT → Kafka → FastAPI Processor → TimescaleDB
```

1. Device simulator publishes to MQTT  
2. Telemetry ingest forwards to Kafka  
3. Telemetry processor writes to TimescaleDB  
4. Dashboard queries aggregated data (with demo/mock fallbacks when offline)  

---

## Local development

> **First time?** Start with **[How to run this project](#how-to-run-this-project)** (Option A or B). This section is for **per-service** env files and advanced setups.

### 1. Environment variables

Each backend service may ship `.env.example`. Copy and tune before running:

```bash
cp services/auth-service/.env.example services/auth-service/.env
# Repeat for user, subscription, billing, support, DISCOM, telemetry, etc.
```

Verify: MongoDB/TimescaleDB URLs, Kafka/MQTT, JWT secrets, gateway URLs.

### 2. Install dependencies

```bash
cd services/auth-service && npm install
cd ../../apps/web && npm install
```

Python telemetry processor:

```bash
cd services/telemetry-processor
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Run services

```bash
cd infra && docker compose up -d    # databases, Kafka, etc.

cd services/auth-service && npm run dev
cd apps/web && npm run dev
```

Telemetry processor:

```bash
cd services/telemetry-processor
uvicorn app.main:app --reload --port 3006
```

---

## Checks & quality

### Node services

```bash
cd services/auth-service
npm test
npm run lint
```

### Frontend

```bash
cd apps/web
npm run build    # TypeScript + Vite production build
npm run preview
```

### Python

```bash
cd services/telemetry-processor
# uvicorn ... ; add pytest when tests exist
```

---

## Deployment

### Docker Compose

```bash
cd infra
docker compose -f docker-compose.yml up -d
```

### Kubernetes

```bash
kubectl apply -f infra/k8s/
```

---

## Monitoring & observability

Services typically expose:

- Health: `/health`, `/health/ready`, `/health/live`  
- Metrics: `/metrics` (Prometheus)  
- Structured JSON logs  

---

## Contributing

1. Fork the repository  
2. Create a feature branch  
3. Commit your changes  
4. Push and open a Pull Request  

---

## License

MIT License — see [LICENSE.md](./LICENSE.md).

---

## Support

For support: **aharshilodh417@gmail.com**
