# Rate Limiting Proxy API

A proxy API service that handles rate limiting for third-party APIs. This service acts as an intermediary layer between clients and their target APIs, managing rate limits transparently.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Technical Stack](#technical-stack)
- [API Documentation](#api-documentation)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Application Registration](#application-registration)
  - [Proxy API](#proxy-api)
- [Rate Limiting Strategies](#rate-limiting-strategies)
  - [Token Bucket](#token-bucket)
  - [Fixed Window](#fixed-window)
  - [Sliding Window](#sliding-window)
  - [Leaky Bucket](#leaky-bucket)
- [Request Queuing](#request-queuing)
- [Assumptions Made](#assumptions-made)
- [Example Usage](#example-usage)
  - [Register a user and generate an API key](#register-a-user-and-generate-an-api-key)
  - [Register an app](#register-an-app)
  - [Use the proxy](#use-the-proxy)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **API Key Management**: Secure authentication system for generating and validating API keys
- **Application Registration**: Register external APIs with custom rate limiting configurations
- **Proxy Functionality**: Forward requests to registered APIs while maintaining request/response integrity
- **Rate Limit Handling**: Multiple rate limiting strategies with automatic request queuing
- **Request Queue**: Queue requests when rate limits are reached and process them when possible

## Architecture

The Rate Limiting Proxy API uses a layered architecture:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│   Client    │ ────►   │   Proxy     │ ────►   │  Target     │
│             │         │   Service   │         │   API       │
│             │         │             │         │             │
└─────────────┘         └──────┬──────┘         └─────────────┘
                               │
                        ┌──────▼──────┐
                        │             │
                        │ Rate Limit  │
                        │  Service    │
                        │             │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │             │
                        │   Queue     │
                        │  Service    │
                        │             │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │             │
                        │ PostgreSQL  │
                        │  Database   │
                        │             │
                        └─────────────┘
```

1. **Client** sends a request to the proxy
2. **Proxy Service** authenticates and forwards requests
3. **Rate Limit Service** checks limits and determines if request can proceed
4. **Queue Service** handles queuing when rate limits are reached
5. **PostgreSQL Database** stores configuration and tracks rate limits

## Technical Stack

- TypeScript
- Express.js
- PostgreSQL with Sequelize ORM
- Axios for proxying requests

## API Documentation

Explore and test the API using our Postman Collection:
- [Rate Limiting Proxy API - Postman Documentation](https://documenter.getpostman.com/view/7122533/2sB2cYeM3P)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port number for the server | `3000` |
| `NODE_ENV` | Environment (development, production, test) | `development` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `rate_limiting_proxy` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | Secret key for JWT token generation | - |
| `JWT_EXPIRES_IN` | JWT token expiration time | `24h` |
| `API_KEY_PREFIX` | Prefix for generated API keys | `rlp_` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_TO_FILE` | Whether to write logs to file | `false` |
| `LOG_PATH` | Path for log files | `logs` |

### Installation

1. Clone this repository
```bash
git clone <repository-url>
cd rate-limiting-proxy-api
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rate_limiting_proxy
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# API Configuration
API_KEY_PREFIX=rlp_
```

4. Create the PostgreSQL database
```bash
createdb rate_limiting_proxy
```

5. Build and start the application
```bash
npm run build
npm start
```

For development with hot reloading:
```bash
npm run dev
```

## API Endpoints

### Authentication

#### Register a new user
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "user123",
    "email": "user@example.com",
    "password": "secure_password"
  }
  ```
- **Response**:
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "uuid",
      "username": "user123",
      "email": "user@example.com"
    },
    "token": "jwt_token"
  }
  ```

#### Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "user123",
    "password": "secure_password"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "uuid",
      "username": "user123",
      "email": "user@example.com"
    },
    "token": "jwt_token"
  }
  ```

#### Generate API Key
- **URL**: `/api/auth/api-key`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer jwt_token`
- **Response**:
  ```json
  {
    "message": "API key generated successfully",
    "apiKey": {
      "id": "uuid",
      "key": "rlp_abc123def456",
      "createdAt": "2023-07-20T12:00:00Z"
    }
  }
  ```

#### Get API Keys
- **URL**: `/api/auth/api-keys`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer jwt_token`
- **Response**:
  ```json
  {
    "message": "API keys retrieved successfully",
    "apiKeys": [
      {
        "id": "uuid",
        "key": "rlp_abc123def456",
        "lastUsed": "2023-07-20T13:00:00Z",
        "createdAt": "2023-07-20T12:00:00Z"
      }
    ]
  }
  ```

#### Revoke API Key
- **URL**: `/api/auth/api-key/:id`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer jwt_token`
- **Response**:
  ```json
  {
    "message": "API key revoked successfully"
  }
  ```

### Application Registration

#### Register a new app
- **URL**: `/api/apps/register`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer jwt_token` or `X-API-Key: rlp_abc123def456`
- **Body**:
  ```json
  {
    "name": "My API",
    "baseUrl": "https://api.example.com",
    "rateLimitStrategy": "token_bucket",
    "requestLimit": 100,
    "timeWindowMs": 60000,
    "additionalConfig": {
      "priority": 1
    }
  }
  ```
- **Response**:
  ```json
  {
    "message": "App registered successfully",
    "app": {
      "id": "uuid",
      "name": "My API",
      "baseUrl": "https://api.example.com/",
      "rateLimitStrategy": "token_bucket",
      "requestLimit": 100,
      "timeWindowMs": 60000,
      "additionalConfig": {
        "priority": 1
      },
      "createdAt": "2023-07-20T12:00:00Z"
    }
  }
  ```

#### Get user's apps
- **URL**: `/api/apps`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer jwt_token` or `X-API-Key: rlp_abc123def456`
- **Response**:
  ```json
  {
    "message": "Apps retrieved successfully",
    "apps": [
      {
        "id": "uuid",
        "name": "My API",
        "baseUrl": "https://api.example.com/",
        "rateLimitStrategy": "token_bucket",
        "requestLimit": 100,
        "timeWindowMs": 60000,
        "createdAt": "2023-07-20T12:00:00Z"
      }
    ]
  }
  ```

#### Get app by ID
- **URL**: `/api/apps/:id`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer jwt_token` or `X-API-Key: rlp_abc123def456`
- **Response**:
  ```json
  {
    "message": "App retrieved successfully",
    "app": {
      "id": "uuid",
      "name": "My API",
      "baseUrl": "https://api.example.com/",
      "rateLimitStrategy": "token_bucket",
      "requestLimit": 100,
      "timeWindowMs": 60000,
      "additionalConfig": {
        "priority": 1
      },
      "rateLimit": {
        "currentCount": 0,
        "windowStartTime": "2023-07-20T12:00:00Z",
        "resetTime": "2023-07-20T13:00:00Z"
      },
      "createdAt": "2023-07-20T12:00:00Z",
      "updatedAt": "2023-07-20T12:00:00Z"
    }
  }
  ```

#### Update app
- **URL**: `/api/apps/:id`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer jwt_token` or `X-API-Key: rlp_abc123def456`
- **Body**:
  ```json
  {
    "name": "Updated API Name",
    "requestLimit": 200
  }
  ```
- **Response**:
  ```json
  {
    "message": "App updated successfully",
    "app": {
      "id": "uuid",
      "name": "Updated API Name",
      "baseUrl": "https://api.example.com/",
      "rateLimitStrategy": "token_bucket",
      "requestLimit": 200,
      "timeWindowMs": 60000,
      "additionalConfig": {
        "priority": 1
      },
      "createdAt": "2023-07-20T12:00:00Z",
      "updatedAt": "2023-07-20T12:30:00Z"
    }
  }
  ```

#### Delete app
- **URL**: `/api/apps/:id`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer jwt_token` or `X-API-Key: rlp_abc123def456`
- **Response**:
  ```json
  {
    "message": "App deleted successfully"
  }
  ```

#### Search apps
- **URL**: `/api/apps/search?q=example`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer jwt_token` or `X-API-Key: rlp_abc123def456`
- **Response**:
  ```json
  {
    "message": "Search results",
    "apps": [
      {
        "id": "uuid",
        "name": "My API",
        "baseUrl": "https://api.example.com/",
        "rateLimitStrategy": "token_bucket",
        "requestLimit": 100,
        "timeWindowMs": 60000,
        "createdAt": "2023-07-20T12:00:00Z"
      }
    ]
  }
  ```

### Proxy API

#### Proxy request to a registered API
- **URL**: `/apis/:appId/*`
- **Method**: Any HTTP method (GET, POST, PUT, DELETE, etc.)
- **Headers**: `X-API-Key: rlp_abc123def456` (Required)
- **Response**: Same as the response from the target API

#### Rate limit headers:
- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Time when the rate limit window resets (Unix timestamp)
- `X-RateLimit-Retry-After`: Time to wait before retrying (when rate limited)
- `X-Proxy-Timestamp`: Timestamp when the proxy processed the request
- `X-Proxied-By`: Identifier of the proxy service

## Rate Limiting Strategies

This proxy API supports multiple rate limiting strategies. The table below summarizes the key differences:

| Strategy | Burst Handling | Accuracy | Complexity | Best For |
|----------|----------------|----------|------------|----------|
| Token Bucket | Excellent | Good | Medium | APIs with occasional burst needs |
| Fixed Window | Poor | Medium | Low | Simple rate limiting needs |
| Sliding Window | Good | Excellent | High | Smooth distribution of requests |
| Leaky Bucket | Poor | Good | Medium | Constant rate scenarios |

### Token Bucket

- **Strategy ID**: `token_bucket`
- **Description**: A token bucket algorithm that adds tokens to a bucket at a steady rate and consumes a token for each request. This allows for bursts of traffic while maintaining a long-term rate limit.
- **Parameters**:
  - `requestLimit`: Maximum bucket capacity (maximum burst size)
  - `timeWindowMs`: Time window in milliseconds that determines the token refill rate

### Fixed Window

- **Strategy ID**: `fixed_window`
- **Description**: Simple counter that resets after a fixed time window. Counts requests in the current time window and rejects if the limit is exceeded.
- **Parameters**:
  - `requestLimit`: Maximum number of requests allowed in the window
  - `timeWindowMs`: Time window in milliseconds

### Sliding Window

- **Strategy ID**: `sliding_window`
- **Description**: Counts requests in the current time window but also considers the previous window's count, weighted by how recently the current window started.
- **Parameters**:
  - `requestLimit`: Maximum number of requests allowed in the window
  - `timeWindowMs`: Time window in milliseconds

### Leaky Bucket

- **Strategy ID**: `leaky_bucket`
- **Description**: Requests fill a bucket that "leaks" at a constant rate. If the bucket overflows, the request is rate limited.
- **Parameters**:
  - `requestLimit`: Maximum bucket capacity
  - `timeWindowMs`: Time window in milliseconds that determines the leak rate

## Request Queuing

When a request is rate limited, it will be automatically queued and processed when the rate limit window refreshes or when enough tokens are available. The maximum queue size and timeout can be configured in the application settings.

## Assumptions Made

1. API keys are separate from JWT tokens, allowing for different authentication mechanisms
2. Each registered app has its own rate limit tracking
3. Rate limit windows are based on the first request after a reset
4. Requests are queued on a per-app basis
5. Apps can be soft-deleted (marked inactive) but not permanently removed

## Example Usage

### Register a user and generate an API key

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'

# Login and get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'

# Generate an API key (replace JWT_TOKEN with your token)
curl -X POST http://localhost:3000/api/auth/api-key \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Register an app

```bash
# Register a new app (replace API_KEY with your key)
curl -X POST http://localhost:3000/api/apps/register \
  -H "X-API-Key: API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub API",
    "baseUrl": "https://api.github.com",
    "rateLimitStrategy": "token_bucket",
    "requestLimit": 60,
    "timeWindowMs": 60000
  }'
```

### Use the proxy

```bash
# Use the proxy to access the registered API (replace APP_ID and API_KEY)
curl -X GET http://localhost:3000/apis/APP_ID/users/octocat \
  -H "X-API-Key: API_KEY"
```

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| `ECONNREFUSED` when connecting to database | PostgreSQL not running or wrong connection details | Verify PostgreSQL is running and check DB_* environment variables |
| `429 Too Many Requests` but queue not working | Queue might be full or rate limit configuration issue | Check `maxQueueSize` in config, verify rate limit settings |
| Authentication failing with valid credentials | JWT token expired | Generate a new token by logging in again |
| Proxy requests failing with 404 | Incorrect app ID or path | Verify the app ID and ensure the path matches the target API's expected format |
| Rate limits not resetting | Time window configuration issue | Check `timeWindowMs` setting and server clock |

### Logs

Check the logs directory for detailed error information:
- `logs/error.log` - Contains only error messages
- `logs/all.log` - Contains all log levels

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and passes all tests.

## License

MIT