# User Service

User management service for the EnergiX platform.

## Responsibilities

- User profile management
- User preferences
- User listing and search (admin)
- User synchronization from auth service

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /users | Create/sync user (internal) |
| GET | /users/me | Get current user profile |
| PUT | /users/me | Update current user profile |
| GET | /users | List all users (admin) |
| GET | /users/:id | Get user by ID (admin) |
| DELETE | /users/:id | Deactivate user (admin) |
| GET | /health | Health check |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3002 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/energix_users |
| JWT_SECRET | JWT verification secret | required |
