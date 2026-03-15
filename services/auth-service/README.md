# Auth Service

Authentication and authorization service for the EnergiX platform.

## Responsibilities

- User registration and login (email/password)
- Google OAuth integration
- JWT token generation and validation
- Token refresh and logout
- User session management

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Register new user with email/password |
| POST | /auth/login | Login with email/password |
| POST | /auth/google | Login/signup with Google OAuth |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout current session |
| POST | /auth/logout-all | Logout all sessions |
| GET | /health | Health check |
| GET | /health/ready | Readiness probe |
| GET | /health/live | Liveness probe |
| GET | /metrics | Prometheus metrics |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/energix_auth |
| JWT_SECRET | JWT signing secret | required |
| JWT_EXPIRES_IN | Access token expiry | 15m |
| JWT_REFRESH_SECRET | Refresh token signing secret | required |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiry | 7d |
| GOOGLE_CLIENT_ID | Google OAuth client ID | required for Google auth |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | required for Google auth |
| FRONTEND_URL | CORS allowed origin | http://localhost:5173 |

## Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values

# Run in development mode
npm run dev

# Run tests
npm test
```

## Docker

```bash
# Build image
docker build -t energix/auth-service .

# Run container
docker run -p 3001:3001 --env-file .env energix/auth-service
```
