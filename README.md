# Task Management API Backend

A robust Node.js REST API for task management with JWT authentication, Redis caching, and MongoDB storage.

## Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 📝 **Task CRUD Operations** - Complete task management
- ⚡ **Redis Caching** - High-performance caching with TTL and LRU policy
- 🗄️ **MongoDB Integration** - Reliable data storage
- 🐳 **Docker Support** - Easy containerization
- 🔒 **Password Hashing** - Secure bcrypt password encryption
- ✅ **Input Validation** - Comprehensive request validation

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Redis
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables (.env):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskmanager
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

3. **Start the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

### Base URL
```
http://localhost:5000
```

### Authentication Endpoints

#### 1. User Registration
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "createdAt": "2025-01-20T10:00:00.000Z"
  }
}
```

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "createdAt": "2025-01-20T10:00:00.000Z"
  }
}
```

### Task Management Endpoints

> **Note:** All task endpoints require JWT authentication. Include the token in the Authorization header:
> ```
> Authorization: Bearer your-jwt-token
> ```

#### 1. Get All Tasks
```http
GET /api/tasks
Authorization: Bearer your-jwt-token
```

**Response:**
```json
{
  "message": "Tasks retrieved successfully",
  "tasks": [
    {
      "_id": "task-id",
      "taskName": "Complete project",
      "description": "Finish the task management API",
      "dueDate": "2025-01-25T00:00:00.000Z",
      "userId": "user-id",
      "createdAt": "2025-01-20T10:00:00.000Z"
    }
  ],
  "cached": false
}
```

#### 2. Get Specific Task
```http
GET /api/tasks/:id
Authorization: Bearer your-jwt-token
```

#### 3. Create New Task
```http
POST /api/tasks
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "taskName": "Complete project",
  "description": "Finish the task management API",
  "dueDate": "2025-01-25"
}
```

#### 4. Update Task
```http
PUT /api/tasks/:id
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "taskName": "Updated task name",
  "description": "Updated description",
  "dueDate": "2025-01-26"
}
```

#### 5. Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer your-jwt-token
```

### Cache Management

#### Clear Cache
```http
POST /api/clear-cache
Authorization: Bearer your-jwt-token
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/clear-cache \
  -H "Authorization: Bearer your-jwt-token"
```

### Health Check

#### API Health Status
```http
GET /health
```

**Response:**
```json
{
  "message": "API is running",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "uptime": 123.456
}
```

## Redis Caching Strategy

- **Task List Cache**: 5-minute TTL per user
- **Individual Task Cache**: 5-minute TTL per task
- **Cache Invalidation**: Automatic on task create/update/delete
- **LRU Policy**: Least Recently Used eviction
- **Manual Cache Clear**: `/api/clear-cache` endpoint

## Database Schema

### User Schema
```javascript
{
  email: String (required, unique),
  password: String (required, hashed),
  createdAt: Date (default: Date.now)
}
```

### Task Schema
```javascript
{
  taskName: String (required),
  description: String (optional),
  dueDate: Date (required),
  userId: ObjectId (required, ref: Users),
  createdAt: Date (default: Date.now)
}
```

## Error Handling

### Common Error Responses

#### 400 - Bad Request
```json
{
  "message": "Task name and due date are required"
}
```

#### 401 - Unauthorized
```json
{
  "message": "Access token required"
}
```

#### 403 - Forbidden
```json
{
  "message": "Invalid or expired token"
}
```

#### 404 - Not Found
```json
{
  "message": "Task not found"
}
```

#### 409 - Conflict
```json
{
  "message": "User already exists with this email"
}
```

#### 500 - Internal Server Error
```json
{
  "message": "Internal server error"
}
```

## Testing Examples

### Test User Registration
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Create Task
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"taskName":"Test Task","description":"Test Description","dueDate":"2025-01-25"}'
```

### Test Get All Tasks
```bash
curl -X GET http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Docker Support

Create a `docker-compose.yml` for easy development setup:

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/taskmanager
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## Security Features

- ✅ **JWT Authentication** with 24-hour expiration
- ✅ **Password Hashing** using bcrypt with 10 salt rounds
- ✅ **Input Validation** for all endpoints
- ✅ **CORS Protection** enabled
- ✅ **Environment Variables** for sensitive data
- ✅ **User Isolation** - users can only access their own tasks

## Performance Features

- ⚡ **Redis Caching** with 5-minute TTL
- ⚡ **LRU Cache Policy** for memory efficiency
- ⚡ **Automatic Cache Invalidation** on data changes
- ⚡ **Connection Pooling** for MongoDB
- ⚡ **Graceful Shutdown** handling

## Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
REDIS_URL=your-production-redis-uri
JWT_SECRET=your-super-secure-jwt-secret
```

### Deployment Tips
1. Use a strong JWT secret in production
2. Enable MongoDB authentication
3. Set up Redis password protection
4. Use HTTPS in production
5. Implement rate limiting for API endpoints
6. Set up monitoring and logging

## Support

For issues and questions, please check the API endpoints and ensure:
- MongoDB is running and accessible
- Redis is running and accessible
- Environment variables are properly configured
- JWT tokens are included in protected requests

## License

MIT License
