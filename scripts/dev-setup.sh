#!/bin/bash

# DineNow Development Environment Setup Script
# This script sets up the complete development environment using Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service failed to start within expected time"
    return 1
}

# Function to wait for database
wait_for_database() {
    local max_attempts=30
    local attempt=1

    print_status "Waiting for database to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T database pg_isready -U postgres -d restaurant_app >/dev/null 2>&1; then
            print_success "Database is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Database failed to start within expected time"
    return 1
}

# Main setup function
main() {
    echo ""
    echo "🚀 DineNow Development Environment Setup"
    echo "========================================"
    echo ""

    # Check prerequisites
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi

    print_success "Prerequisites check passed"

    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your Telegram bot configuration before continuing."
        print_warning "At minimum, set TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_BOT_USERNAME"
        echo ""
        read -p "Press Enter to continue after editing .env file..."
        echo ""
    fi

    # Stop any existing containers
    print_status "Stopping any existing containers..."
    docker-compose down >/dev/null 2>&1 || true

    # Build services
    print_status "Building Docker images..."
    docker-compose build

    # Start database and Redis first
    print_status "Starting database and Redis..."
    docker-compose up -d database redis

    # Wait for database to be ready
    wait_for_database

    # Start backend
    print_status "Starting backend service..."
    docker-compose up -d backend

    # Wait for backend to be ready
    wait_for_service "Backend API" "http://localhost:3001/health"

    # Seed database
    print_status "Seeding database with sample data..."
    docker-compose exec backend pnpm --filter=@dine-now/database seed

    # Start web app
    print_status "Starting web application..."
    docker-compose up -d webapp

    # Wait for webapp to be ready
    wait_for_service "Web App" "http://localhost:3000"

    # Final status check
    print_status "Performing final health check..."
    docker-compose ps

    echo ""
    print_success "🎉 Development environment is ready!"
    echo ""
    echo "Services are running at:"
    echo "  📱 Web App:           http://localhost:3000"
    echo "  🚀 Backend API:       http://localhost:3001"
    echo "  📚 API Documentation: http://localhost:3001/api-docs"
    echo "  🗄️  Database Admin:    http://localhost:8080"
    echo "  🗄️  Database:          localhost:5432 (postgres/password)"
    echo ""
    echo "Sample data includes:"
    echo "  🏪 2 restaurants with full menus"
    echo "  👥 Staff accounts for testing"
    echo "  📦 Sample orders"
    echo ""
    echo "Useful commands:"
    echo "  make help         - Show all available commands"
    echo "  make logs         - View logs from all services"
    echo "  make shell-backend - Access backend container"
    echo "  make seed         - Reseed database"
    echo "  make clean        - Stop and cleanup everything"
    echo ""
    echo "To get started:"
    echo "  1. Open http://localhost:3000 in your browser"
    echo "  2. Use QR codes from tables in sample restaurants"
    echo "  3. Check API docs at http://localhost:3001/api-docs"
    echo ""
}

# Handle Ctrl+C
trap 'echo ""; print_warning "Setup interrupted by user"; exit 1' INT

# Run main function
main "$@"
