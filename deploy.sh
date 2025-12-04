#!/bin/bash

# PDV Master - Deploy Script
# Usage: ./deploy.sh [dev|prod|stop|clean]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Health check functions
check_health() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    log_info "Waiting for $service to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "$service is healthy"
            return 0
        fi

        log_info "Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 2
        ((attempt++))
    done

    log_error "$service failed to become healthy after $max_attempts attempts"
    return 1
}

# Main deployment functions
deploy_dev() {
    log_info "Starting development environment..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    # Pull latest images
    docker-compose pull

    # Start services
    docker-compose up -d postgres redis

    # Wait for PostgreSQL
    check_health "PostgreSQL" "http://localhost:5432" || {
        log_error "PostgreSQL health check failed. Checking logs..."
        docker-compose logs postgres
        exit 1
    }

    # Start remaining services
    docker-compose up -d pgadmin backend frontend

    # Wait for services
    check_health "Backend API" "http://localhost:3001/health"
    check_health "Frontend" "http://localhost:3000"

    log_success "Development environment is ready!"
    echo ""
    echo "🌐 Frontend:     http://localhost:3000"
    echo "🚀 Backend API:  http://localhost:3001"
    echo "📊 pgAdmin:      http://localhost:5050 (admin@pdvmaster.local / admin123)"
    echo "🔄 Redis:        localhost:6379"
    echo ""
    log_info "Run 'npm run docker:logs' to see logs"
}

deploy_prod() {
    log_info "Starting production environment..."

    # Check environment file
    if [ ! -f ".env.production" ]; then
        log_error "Production environment file '.env.production' not found!"
        log_info "Copy and configure: cp .env.example .env.production"
        exit 1
    fi

    # Load production environment
    export $(cat .env.production | xargs)

    # Build and start production
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d --build

    # Wait for health checks
    check_health "Backend API" "http://localhost:3001/health"

    if [ "${EXPOSE_FRONTEND:-false}" = "true" ]; then
        check_health "Frontend" "http://localhost"
    fi

    log_success "Production environment deployed!"
    echo ""
    echo "🌐 Application:  http://localhost (if frontend enabled)"
    echo "🚀 Backend API:  http://localhost:3001"
    echo "🏥 Health Check: http://localhost/health"
    echo ""
    log_info "Monitor with: npm run docker:logs"
}

stop_services() {
    log_info "Stopping all services..."

    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

    # Clean networks
    docker network prune -f

    log_success "All services stopped"
}

clean_all() {
    log_warning "This will remove ALL containers, volumes, and images!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up Docker environment..."

        docker-compose down -v --rmi all 2>/dev/null || true
        docker-compose -f docker-compose.prod.yml down -v --rmi all 2>/dev/null || true

        docker system prune -a -f
        docker volume prune -f
        docker network prune -f

        log_success "Environment completely cleaned"
    else
        log_info "Clean cancelled"
    fi
}

# Database operations
reset_database() {
    log_warning "This will RESET the entire database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Resetting database..."

        docker-compose exec postgres psql -U pdv_master_user -d pdv_master -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || {
            log_error "Failed to reset database"
            exit 1
        }

        # Re-seed if seed script exists
        if [ -f "backend/seed.js" ]; then
            log_info "Re-seeding database..."
            docker-compose exec postgres psql -U pdv_master_user -d pdv_master -f /docker-entrypoint-initdb.d/04-seed.js 2>/dev/null || true
        fi

        log_success "Database reset complete"
    else
        log_info "Database reset cancelled"
    fi
}

backup_database() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="backup_pdv_master_${timestamp}.sql"

    log_info "Creating database backup..."

    docker-compose exec postgres pg_dump -U pdv_master_user pdv_master > "$backup_file"

    if [ $? -eq 0 ]; then
        log_success "Database backup created: $backup_file"
        log_info "File size: $(ls -lh "$backup_file" | awk '{print $5}')"
    else
        log_error "Database backup failed"
        rm -f "$backup_file"
        exit 1
    fi
}

# Version info
show_version() {
    echo "PDV Master - Deploy Script"
    echo "Version: $(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")"
    echo "Node: $(node --version 2>/dev/null || echo "not installed")"
    echo "Docker: $(docker --version | head -n1)"
    echo "Docker Compose: $(docker-compose --version)"
    echo ""
    echo "Available commands:"
    echo "  dev      - Start development environment"
    echo "  prod     - Start production environment"
    echo "  stop     - Stop all services"
    echo "  clean    - Remove all containers and volumes"
    echo "  db:reset - Reset database (WARNING: deletes all data)"
    echo "  db:backup- Create database backup"
    echo "  version  - Show version info"
    echo "  help     - Show this help"
}

# Help
show_help() {
    echo "PDV Master - Docker Deploy Script"
    echo ""
    echo "USAGE:"
    echo "  ./deploy.sh [command]"
    echo ""
    echo "COMMANDS:"
    echo "  dev              Start development environment"
    echo "  prod             Start production environment"
    echo "  stop             Stop all services"
    echo "  clean            Remove all containers and volumes (DANGER)"
    echo "  db:reset         Reset database schema and data"
    echo "  db:backup        Create database backup"
    echo "  logs             Show logs (alias: npm run docker:logs)"
    echo "  version          Show version information"
    echo "  help             Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  ./deploy.sh dev          # Start development"
    echo "  ./deploy.sh prod         # Deploy to production"
    echo "  ./deploy.sh stop         # Stop all services"
    echo "  ./deploy.sh db:backup    # Backup database"
    echo ""
    echo "For manual Docker commands, use npm scripts:"
    echo "  npm run docker:logs      # View logs"
    echo "  npm run docker:test      # Run tests in container"
    echo "  npm run docker:build     # Build images"
}

# Main script logic
main() {
    local command=${1:-"help"}

    # Make script executable if it wasn't
    if [ ! -x "$0" ]; then
        chmod +x "$0"
    fi

    case $command in
        "dev")
            deploy_dev
            ;;
        "prod")
            deploy_prod
            ;;
        "stop")
            stop_services
            ;;
        "clean")
            clean_all
            ;;
        "db:reset")
            reset_database
            ;;
        "db:backup")
            backup_database
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "version"|"--version"|"-v")
            show_version
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
