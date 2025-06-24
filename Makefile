# DineNow Development Makefile

.PHONY: help dev up down build clean logs shell-backend shell-webapp shell-db seed reset-db install test

# Default target
help: ## Show this help message
	@echo "DineNow Restaurant Ordering System - Development Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

# Development Commands
dev: ## Start all services in development mode
	docker-compose up -d database redis
	@echo "Waiting for database to be ready..."
	@sleep 10
	docker-compose up backend webapp adminer

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

build: ## Build all services
	docker-compose build

rebuild: ## Rebuild all services from scratch
	docker-compose build --no-cache

# Database Commands
seed: ## Seed the database with sample data
	docker-compose exec backend pnpm --filter=@dine-now/database seed

reset-db: ## Reset database and reseed
	docker-compose exec backend pnpm --filter=@dine-now/database db:reset

migrate: ## Run database migrations
	docker-compose exec backend pnpm --filter=@dine-now/database db:migrate

db-studio: ## Open Drizzle Studio for database management
	docker-compose exec backend pnpm --filter=@dine-now/database db:studio

# Utility Commands
logs: ## Show logs for all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-webapp: ## Show webapp logs
	docker-compose logs -f webapp

logs-db: ## Show database logs
	docker-compose logs -f database

# Shell Access
shell-backend: ## Access backend container shell
	docker-compose exec backend sh

shell-webapp: ## Access webapp container shell
	docker-compose exec webapp sh

shell-db: ## Access database container shell
	docker-compose exec database psql -U postgres -d restaurant_app

# Development Tools
install: ## Install dependencies in containers
	docker-compose exec backend pnpm install
	docker-compose exec webapp pnpm install

test-backend: ## Run backend tests
	docker-compose exec backend pnpm --filter=@dine-now/backend test

test-shared: ## Run shared package tests
	docker-compose exec backend pnpm --filter=@dine-now/shared test

lint: ## Run linting
	docker-compose exec backend pnpm --filter=@dine-now/backend lint
	docker-compose exec webapp pnpm --filter=@dine-now/webapp lint

# Cleanup Commands
clean: ## Stop services and remove containers, networks, and volumes
	docker-compose down -v --remove-orphans
	docker system prune -f

# Health Checks
health: ## Check health of all services
	@echo "Checking service health..."
	@docker-compose ps
	@echo "\nBackend health:"
	@curl -s http://localhost:3001/health | jq '.' || echo "Backend not responding"
	@echo "\nDatabase health:"
	@docker-compose exec database pg_isready -U postgres -d restaurant_app || echo "Database not ready"

# Quick Setup
setup: ## Complete setup for new development environment
	@echo "Setting up DineNow development environment..."
	@if [ ! -f .env ]; then \
		echo "Creating .env file from template..."; \
		cp .env.example .env; \
		echo "Please edit .env file with your configuration"; \
	fi
	docker-compose build
	docker-compose up -d database redis
	@echo "Waiting for database..."
	@sleep 15
	docker-compose up -d backend adminer
	@echo "Waiting for backend..."
	@sleep 10
	$(MAKE) migrate
	$(MAKE) seed
	docker-compose up -d webapp
	@echo ""
	@echo "🎉 Setup complete!"
	@echo ""
	@echo "Services running:"
	@echo "  📱 Web App:        http://localhost:3000"
	@echo "  🚀 Backend API:    http://localhost:3001"
	@echo "  📚 API Docs:       http://localhost:3001/api-docs"
	@echo "  🗄️  Database Admin: http://localhost:8080"
	@echo "  🗄️  Database:       localhost:5432"
	@echo ""
	@echo "Use 'make help' to see all available commands"

# Production Commands
prod-build: ## Build for production
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

prod-up: ## Start production services
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Default target when no command is specified
.DEFAULT_GOAL := help
