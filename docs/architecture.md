# EnergiX Architecture Documentation

## System Overview

EnergiX is a cloud-native Energy-as-a-Service platform built on microservices architecture. The platform enables users to monitor energy consumption, manage subscriptions, pay bills, and integrate with utility providers (DISCOMs).

## Design Principles

1. **Microservices**: Independent, loosely coupled services
2. **Event-Driven**: Kafka for asynchronous communication
3. **API-First**: RESTful APIs with Kong Gateway
4. **Cloud-Native**: Containerized with Docker, orchestrated with Kubernetes
5. **Observability**: Metrics, logging, and health checks in all services

## Component Details

### Frontend (Web Application)

**Technology**: React 18 + TypeScript + Vite + Tailwind CSS

**Features**:
- JWT-based authentication
- Real-time dashboard with energy charts
- Plan subscription management
- Billing and invoice management
- Support ticket system
- Admin panel

**State Management**: Zustand for global state

### Backend Services

#### 1. Auth Service (Node.js/TypeScript)

**Responsibilities**:
- User registration and login
- JWT token generation and validation
- Google OAuth integration
- Token refresh and logout

**Key Features**:
- bcrypt password hashing
- Short-lived access tokens (15 min)
- HTTP-only refresh token cookies
- RBAC support (user, admin roles)

#### 2. User Service (Node.js/TypeScript)

**Responsibilities**:
- User profile management
- User preferences
- Admin user listing

**Database**: MongoDB

#### 3. Subscription Service (Node.js/TypeScript)

**Responsibilities**:
- Plan management
- Subscription lifecycle
- Device registration

**Models**:
- Plan: name, type, price, features
- Subscription: userId, planId, status, dates
- Device: userId, subscriptionId, type, status

#### 4. Billing Service (Node.js/TypeScript)

**Responsibilities**:
- Invoice generation
- Payment processing (Razorpay)
- PDF generation and S3 storage

**Integrations**:
- Razorpay for payments
- MinIO/S3 for invoice storage
- PDFKit for PDF generation

#### 5. Telemetry Ingest (Node.js)

**Responsibilities**:
- MQTT client for device messages
- Kafka producer for streaming

**Flow**: MQTT → Kafka

#### 6. Telemetry Processor (Python/FastAPI)

**Responsibilities**:
- Kafka consumer
- Data aggregation
- TimescaleDB storage

**Flow**: Kafka → TimescaleDB

#### 7. Support Service (Node.js/TypeScript)

**Responsibilities**:
- Ticket creation and management
- Comments on tickets
- SLA tracking

#### 8. DISCOM Adapter (Node.js/TypeScript)

**Responsibilities**:
- Abstract DISCOM integration
- Application submission
- Status tracking

**Pattern**: Adapter pattern for external service integration

#### 9. DISCOM Simulator (Node.js)

**Responsibilities**:
- Mock DISCOM responses
- Simulate approval workflows
- Test failure scenarios

## Data Flow

### User Registration Flow

```
User → Web → Kong → Auth Service → MongoDB
                ↓
           User Service (sync)
```

### Telemetry Flow

```
Device → MQTT → Telemetry Ingest → Kafka → Telemetry Processor → TimescaleDB
                                              ↓
                                         Web (dashboard)
```

### Billing Flow

```
Time → Billing Service → Invoice Generation → S3
                              ↓
                         User Notification
                              ↓
                         Payment (Razorpay)
                              ↓
                         Status Update
```

## Database Schema

### MongoDB Collections

- **users**: User profiles, authentication
- **plans**: Subscription plans
- **subscriptions**: User subscriptions
- **devices**: IoT devices
- **invoices**: Billing invoices
- **payments**: Payment records
- **tickets**: Support tickets
- **discom_applications**: DISCOM applications

### TimescaleDB Tables

- **telemetry_data**: Raw time-series data (hypertable)
- **aggregated_telemetry**: Aggregated metrics (hypertable)

## Security

### Authentication
- JWT tokens with short expiry
- Refresh tokens in HTTP-only cookies
- bcrypt password hashing (12 rounds)

### Authorization
- RBAC with user and admin roles
- Service-to-service authentication via JWT

### Data Protection
- TLS for all communications
- Encrypted secrets in environment variables
- S3 presigned URLs for file access

## Scalability

### Horizontal Scaling
- Stateless services (easy to replicate)
- Kafka for message buffering
- Database read replicas

### Caching Strategy
- JWT token caching
- Plan data caching
- Telemetry aggregation caching

## Monitoring

### Metrics
- Prometheus metrics on /metrics
- Custom business metrics
- Infrastructure metrics

### Logging
- Structured JSON logging
- Correlation IDs for tracing
- Log aggregation ready

### Health Checks
- Liveness: /health/live
- Readiness: /health/ready
- Deep health: /health

## Deployment

### Docker Compose (Local)
```bash
docker-compose up -d
```

### Kubernetes (Production)
```bash
kubectl apply -f infra/k8s/
```

### CI/CD Pipeline
1. Code commit
2. Automated tests
3. Docker image build
4. Security scan
5. Deploy to staging
6. Integration tests
7. Deploy to production
