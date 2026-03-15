# EnergiX API Specification

## Base URL

```
Local: http://localhost:8000
Production: https://api.energix.com
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All responses follow a standard format:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Auth API

### POST /auth/signup

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+91-9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "expiresIn": 900
    }
  }
}
```

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** Same as signup

### POST /auth/google

Login with Google OAuth.

**Request:**
```json
{
  "idToken": "google_id_token"
}
```

**Response:** Same as signup

### POST /auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": 900
  }
}
```

### POST /auth/logout

Logout user.

**Response:**
```json
{
  "success": true,
  "data": null
}
```

## User API

### GET /users/me

Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+91-9876543210",
    "role": "user",
    "preferences": {
      "notifications": {
        "email": true,
        "sms": false
      }
    }
  }
}
```

### PUT /users/me

Update user profile.

**Request:**
```json
{
  "firstName": "Jane",
  "phone": "+91-9876543211"
}
```

**Response:** Updated user object

## Plans API

### GET /plans

List all active plans.

**Query Parameters:**
- `type`: Filter by type (residential, commercial, industrial)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_id",
      "name": "Residential Basic",
      "description": "Perfect for small homes",
      "type": "residential",
      "basePrice": 99,
      "unitPrice": 8.5,
      "features": ["Real-time monitoring", "Mobile app"],
      "maxDevices": 3
    }
  ]
}
```

### GET /plans/:id

Get plan by ID.

**Response:** Single plan object

## Subscriptions API

### GET /subscriptions/my

Get current user's subscription.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sub_id",
    "planId": "plan_id",
    "plan": { /* plan object */ },
    "status": "active",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-02-01T00:00:00Z",
    "autoRenew": true
  }
}
```

### POST /subscriptions

Create new subscription.

**Request:**
```json
{
  "planId": "plan_id"
}
```

**Response:** Created subscription object

### PUT /subscriptions/:id/cancel

Cancel subscription.

**Response:** Updated subscription object

## Devices API

### GET /devices

List user's devices.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "device_id",
      "name": "Main Meter",
      "type": "smart_meter",
      "serialNumber": "SM123456",
      "status": "online",
      "lastSeenAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /devices

Register new device.

**Request:**
```json
{
  "name": "Solar Inverter",
  "type": "solar_inverter",
  "serialNumber": "SI789012",
  "manufacturer": "SolarTech",
  "model": "ST-5000",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "123 Main St, Mumbai"
  }
}
```

**Response:** Created device object

## Invoices API

### GET /invoices/my

List user's invoices.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_id",
      "invoiceNumber": "INV-202401-ABC123",
      "periodStart": "2024-01-01T00:00:00Z",
      "periodEnd": "2024-01-31T23:59:59Z",
      "dueDate": "2024-02-10T00:00:00Z",
      "status": "pending",
      "totalAmount": 2500,
      "amountDue": 2500
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

### GET /invoices/:id/download

Download invoice PDF.

**Response:** PDF file or redirect to signed URL

## Payments API

### POST /payments/create-order

Create Razorpay order for invoice payment.

**Request:**
```json
{
  "invoiceId": "inv_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order_id",
      "amount": 250000,
      "currency": "INR"
    },
    "keyId": "rzp_test_xxx"
  }
}
```

### POST /payments/verify

Verify Razorpay payment.

**Request:**
```json
{
  "razorpayOrderId": "order_id",
  "razorpayPaymentId": "payment_id",
  "razorpaySignature": "signature"
}
```

**Response:** Payment object

## Tickets API

### GET /tickets/my

List user's support tickets.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ticket_id",
      "ticketNumber": "TKT-202401-XYZ789",
      "subject": "Billing issue",
      "category": "billing",
      "priority": "medium",
      "status": "open",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /tickets

Create new support ticket.

**Request:**
```json
{
  "subject": "Billing issue",
  "description": "I was charged incorrectly...",
  "category": "billing",
  "priority": "medium"
}
```

**Response:** Created ticket object

### POST /tickets/:id/comments

Add comment to ticket.

**Request:**
```json
{
  "content": "Any update on this?"
}
```

**Response:** Created comment object

## Telemetry API

### GET /api/v1/telemetry/:userId

Get user's telemetry data.

**Query Parameters:**
- `deviceId`: Filter by device
- `source`: Filter by source (grid, solar, battery, load)
- `start_time`: Start timestamp
- `end_time`: End timestamp
- `limit`: Maximum records (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "telemetry_id",
      "deviceId": "device_id",
      "timestamp": "2024-01-15T10:30:00Z",
      "metrics": {
        "voltage": 230.5,
        "current": 10.2,
        "power": 2351,
        "energy": 125.5
      },
      "source": "grid"
    }
  ]
}
```

### GET /api/v1/telemetry/:userId/summary

Get aggregated telemetry summary.

**Query Parameters:**
- `period`: Aggregation period (hour, day, week, month)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "day",
    "sources": {
      "grid": {
        "total_energy_kwh": 15.2,
        "avg_power_w": 633,
        "max_power_w": 2500
      },
      "solar": {
        "total_energy_kwh": 8.5,
        "avg_power_w": 354,
        "max_power_w": 4000
      }
    }
  }
}
```

### GET /api/v1/telemetry/:userId/realtime

Get realtime telemetry data.

**Response:**
```json
{
  "success": true,
  "data": {
    "grid": {
      "power": 1500,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "solar": {
      "power": 3000,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "battery": {
      "power": -500,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

## DISCOM API

### POST /discom/applications

Submit DISCOM application.

**Request:**
```json
{
  "discomId": "discom_mumbai",
  "subscriptionId": "sub_id",
  "applicationType": "new_connection",
  "applicationData": {
    "consumerNumber": "1234567890",
    "loadRequested": 5,
    "address": "123 Main St, Mumbai",
    "documents": ["doc1.pdf", "doc2.pdf"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "app_id",
    "discomReference": "DISCOM-ABC123",
    "status": "pending",
    "submittedAt": "2024-01-15T10:30:00Z"
  }
}
```

### GET /discom/applications/my

List user's DISCOM applications.

**Response:** Array of application objects

### GET /discom/applications/:id

Get application by ID with latest status.

**Response:** Application object

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| UNAUTHORIZED | Missing or invalid token | 401 |
| TOKEN_EXPIRED | Access token has expired | 401 |
| FORBIDDEN | Insufficient permissions | 403 |
| NOT_FOUND | Resource not found | 404 |
| VALIDATION_ERROR | Invalid request data | 400 |
| USER_EXISTS | User already registered | 409 |
| INTERNAL_ERROR | Server error | 500 |
| DISCOM_ERROR | External service error | 502 |

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user

## Pagination

List endpoints support pagination:

```
GET /invoices/my?page=2&limit=20
```

Response includes meta object with:
- `page`: Current page
- `limit`: Items per page
- `total`: Total items
- `totalPages`: Total pages
