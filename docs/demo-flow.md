# EnergiX Demo Flow

This document outlines a complete demo walkthrough of the EnergiX platform.

## Prerequisites

```bash
# Start all services
cd infra
docker-compose up -d

# Wait for services to be ready
docker-compose ps
```

## Demo Scenarios

### 1. User Registration and Login

#### Step 1: Sign up as a new user
1. Navigate to http://localhost
2. Click "Sign up"
3. Fill in registration form:
   - Email: demo@energix.com
   - Password: DemoPass123
   - First Name: Demo
   - Last Name: User
   - Phone: +91-9876543210
4. Click "Create account"

**Expected Result**: User is registered and redirected to dashboard

#### Step 2: Login
1. Logout and navigate to login page
2. Enter credentials:
   - Email: demo@energix.com
   - Password: DemoPass123
3. Click "Sign in"

**Expected Result**: User is logged in and sees dashboard

### 2. Plan Subscription

#### Step 1: View available plans
1. Navigate to "Plans" page
2. Review available plans:
   - Residential Basic (₹99/month)
   - Residential Pro (₹199/month)
   - Commercial (₹999/month)

**Expected Result**: All plans are displayed with features and pricing

#### Step 2: Subscribe to a plan
1. Click "Subscribe" on Residential Pro plan
2. Confirm subscription

**Expected Result**: 
- Subscription is created with status "active"
- Current plan card is displayed
- Renewal date is shown

### 3. Device Registration

#### Step 1: Register a smart meter
1. Navigate to "Devices" (via API or future UI)
2. Register device:
   ```json
   {
     "name": "Main Meter",
     "type": "smart_meter",
     "serialNumber": "SM123456789",
     "manufacturer": "EnergyTech",
     "model": "ET-100",
     "location": {
       "latitude": 19.0760,
       "longitude": 72.8777,
       "address": "Demo Home, Mumbai"
     }
   }
   ```

**Expected Result**: Device is registered and appears in device list

### 4. Real-time Telemetry

#### Step 1: Start device simulator
```bash
cd scripts/device-simulator
npm install
cp .env.example .env
npm start
```

#### Step 2: View dashboard
1. Navigate to Dashboard
2. Observe real-time metrics:
   - Grid usage (kW)
   - Solar generation (kW)
   - Battery status (%)
   - Active devices

**Expected Result**: 
- Metrics update every 5 seconds
- Charts show 24-hour history
- Battery level changes based on charging/discharging

### 5. Billing and Payments

#### Step 1: Generate invoice (admin)
```bash
curl -X POST http://localhost:8000/invoices \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user_id>",
    "subscriptionId": "<sub_id>",
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-01-31T23:59:59Z",
    "lineItems": [
      {
        "description": "Residential Pro Plan",
        "quantity": 1,
        "unitPrice": 199,
        "amount": 199,
        "type": "subscription"
      },
      {
        "description": "Energy Usage (150 kWh)",
        "quantity": 150,
        "unitPrice": 7.5,
        "amount": 1125,
        "type": "usage"
      }
    ],
    "subtotal": 1324,
    "taxAmount": 238.32,
    "totalAmount": 1562.32,
    "amountDue": 1562.32
  }'
```

#### Step 2: View invoice
1. Navigate to "Billing" page
2. View generated invoice

**Expected Result**: Invoice is displayed with line items and total

#### Step 3: Make payment
1. Click "Pay" on pending invoice
2. Complete Razorpay checkout (test mode)
3. Verify payment

**Expected Result**:
- Payment is processed
- Invoice status changes to "paid"
- Payment record is created

### 6. Support Ticket

#### Step 1: Create ticket
1. Navigate to "Support" page
2. Click "New Ticket"
3. Fill in:
   - Subject: "Question about my bill"
   - Category: Billing
   - Priority: Medium
   - Description: "I have a question about the charges..."
4. Click "Create Ticket"

**Expected Result**: Ticket is created with number (e.g., TKT-202401-ABC123)

#### Step 2: View tickets
1. View list of tickets
2. Click on ticket to see details

**Expected Result**: Ticket details and status are displayed

### 7. DISCOM Integration

#### Step 1: Submit DISCOM application
1. Submit application via API:
   ```bash
   curl -X POST http://localhost:8000/discom/applications \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "discomId": "discom_mumbai",
       "subscriptionId": "<sub_id>",
       "applicationType": "new_connection",
       "applicationData": {
         "consumerNumber": "1234567890",
         "loadRequested": 5,
         "address": "Demo Home, Mumbai",
         "documents": ["id_proof.pdf", "address_proof.pdf"]
       }
     }'
   ```

**Expected Result**: Application submitted with reference number

#### Step 2: Check application status
1. Query application status
2. Observe status changes (pending → approved/rejected)

**Expected Result**: Status updates as DISCOM simulator processes

### 8. Admin Panel

#### Step 1: Access admin panel
1. Login as admin user
2. Navigate to "Admin" page

**Expected Result**: Admin dashboard with platform statistics

#### Step 2: View platform metrics
- Total users
- Active subscriptions
- Pending tickets
- Monthly revenue

**Expected Result**: All metrics are displayed

## API Testing with cURL

### Health Checks
```bash
# Auth service
curl http://localhost:8000/health

# All services
docker-compose ps
```

### Complete User Flow
```bash
# 1. Signup
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","firstName":"Test","lastName":"User"}'

# 2. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# 3. Get plans
curl http://localhost:8000/plans

# 4. Subscribe (use token from login)
curl -X POST http://localhost:8000/subscriptions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"planId":"<plan_id>"}'

# 5. Get telemetry
curl http://localhost:8000/api/v1/telemetry/<user_id>/realtime \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose logs <service_name>

# Restart service
docker-compose restart <service_name>
```

### Database connection issues
```bash
# Check MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check TimescaleDB
docker-compose exec timescaledb pg_isready -U postgres
```

### Kafka issues
```bash
# List topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Check consumer groups
docker-compose exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove everything
docker system prune -a
```
