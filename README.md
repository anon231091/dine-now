# 🐳 Docker Development Environment

This guide helps you set up and run the DineNow restaurant ordering system using Docker for development.

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0+)
- [Make](https://www.gnu.org/software/make/) (optional, for convenience commands)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd dine-now
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your Telegram bot configuration
# At minimum, you need:
# - TELEGRAM_BOT_TOKEN (from @BotFather)
# - NEXT_PUBLIC_BOT_USERNAME (your bot's username)
```

### 3. Start Development Environment

**Option A: Using Make (Recommended)**
```bash
make setup
```

**Option B: Using Docker Compose directly**
```bash
# Start database and wait for it to be ready
docker-compose up -d database redis
sleep 15

# Start backend and seed database
docker-compose up -d backend
sleep 10
make seed  # or: docker-compose exec backend npm run seed --workspace=@dine-now/database

# Start web app
docker-compose up -d webapp
```

### 4. Access Services

Once everything is running, you can access:

- 📱 **Web App**: http://localhost:3000
- 🚀 **Backend API**: http://localhost:3001
- 📚 **API Documentation**: http://localhost:3001/api-docs
- 🗄️ **Database Admin (Adminer)**: http://localhost:8080
- 🗄️ **Database**: localhost:5432 (postgres/password)

## 🛠️ Development Commands

### Using Make (Recommended)

```bash
make help           # Show all available commands
make dev            # Start all services for development
make logs           # View logs from all services
make shell-backend  # Access backend container
make seed           # Seed database with sample data
make reset-db       # Reset and reseed database
make clean          # Stop and cleanup everything
```

### Using Docker Compose Directly

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend  # Specific service logs

# Stop services
docker-compose down

# Rebuild services
docker-compose build
docker-compose up -d --build

# Access container shells
docker-compose exec backend sh
docker-compose exec webapp sh
docker-compose exec database psql -U postgres -d restaurant_app
```

## 📊 Database Management

### Seeding Data

The database is automatically seeded with sample data including:
- 2 restaurants (Khmer Kitchen, Mekong Cafe)
- Menu categories and items with variants
- Staff members for testing
- Sample orders

```bash
# Seed database
make seed

# Reset database and reseed
make reset-db

# Access database directly
make shell-db
```

### Database Tools

1. **Adminer** (Web UI): http://localhost:8080
   - Server: `database`
   - Username: `postgres`
   - Password: `password`
   - Database: `restaurant_app`

2. **Drizzle Studio**:
   ```bash
   make db-studio
   ```

## 🔧 Development Workflow

### Making Code Changes

The development setup includes hot reload for both backend and frontend:

1. **Backend**: Changes in `apps/backend/src` automatically restart the server
2. **Frontend**: Changes in `apps/webapp/src` trigger Next.js hot reload
3. **Shared packages**: Changes require container restart

### Adding Dependencies

```bash
# Add backend dependency
docker-compose exec backend npm install <package-name> --workspace=@dine-now/backend

# Add frontend dependency  
docker-compose exec webapp npm install <package-name> --workspace=@dine-now/webapp

# Add shared dependency
docker-compose exec backend npm install <package-name> --workspace=@dine-now/shared
```

### Testing

```bash
# Run backend tests
make test-backend

# Run linting
make lint

# Check health of services
make health
```

## 🐛 Troubleshooting

### Common Issues

1. **Database connection errors**:
   ```bash
   # Check if database is ready
   docker-compose exec database pg_isready -U postgres
   
   # Restart database
   docker-compose restart database
   ```

2. **Port conflicts**:
   ```bash
   # Check what's using the ports
   lsof -i :3000  # Web app
   lsof -i :3001  # Backend
   lsof -i :5432  # Database
   ```

3. **Module not found errors**:
   ```bash
   # Rebuild containers
   make rebuild
   
   # Or reinstall dependencies
   make install
   ```

4. **Database schema issues**:
   ```bash
   # Reset database completely
   make clean
   make setup
   ```

### Viewing Logs

```bash
# All services
make logs

# Specific services
make logs-backend
make logs-webapp
make logs-db

# Follow specific container logs
docker-compose logs -f backend
```

### Container Access

```bash
# Backend container
make shell-backend

# Database container
make shell-db

# Web app container
make shell-webapp
```

## 🔄 Data Persistence

- **Database data**: Persisted in Docker volume `dine-now_postgres_data`
- **Redis data**: Persisted in Docker volume `dine-now_redis_data`
- **Uploaded files**: Mounted to `./apps/backend/uploads`

To completely reset data:
```bash
make clean  # Removes volumes and all data
```

## 🌐 Network Configuration

All services run on a custom Docker network `dine-now-network` with the following internal hostnames:

- `database` - PostgreSQL server
- `redis` - Redis server  
- `backend` - Backend API server
- `webapp` - Next.js web application

## 📝 Environment Variables

Key environment variables for development:

```bash
# Database
DB_HOST=database
DB_PORT=5432
DB_NAME=restaurant_app
DB_USER=postgres
DB_PASSWORD=password

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Telegram (Required for full functionality)
TELEGRAM_BOT_TOKEN=your_bot_token
NEXT_PUBLIC_BOT_USERNAME=your_bot_username

# Development features
ENABLE_SWAGGER=true
LOG_LEVEL=debug
```

## 🔒 Security Notes

This Docker setup is **for development only**. For production:

- Change all default passwords
- Use proper secrets management
- Configure proper CORS origins
- Enable SSL/TLS
- Use production-grade database configuration
- Remove development tools (Adminer, Swagger UI, etc.)

## 📚 Additional Resources

- [Backend API Documentation](apps/backend/README.md)
- [Web App Documentation](apps/webapp/README.md)  
- [Database Schema](packages/database/README.md)
- [Shared Types](packages/shared/README.md)
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
