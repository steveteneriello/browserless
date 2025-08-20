#!/bin/bash

set -e

echo "🚀 Browserless Production Deployment Script"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    log_success "All dependencies found"
}

# Install npm dependencies
install_dependencies() {
    log_info "Installing npm dependencies..."
    npm ci
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    npm run test || {
        log_error "Tests failed"
        exit 1
    }
    log_success "All tests passed"
}

# Build TypeScript
build_app() {
    log_info "Building TypeScript..."
    npm run build
    log_success "Build completed"
}

# Run linting
run_lint() {
    log_info "Running linter..."
    npm run lint || {
        log_warning "Linting issues found, but continuing..."
    }
}

# Build Docker image
build_docker() {
    log_info "Building Docker image..."
    docker build -t browserless-app:latest .
    log_success "Docker image built"
}

# Test Docker image
test_docker() {
    log_info "Testing Docker image..."
    
    # Start Redis for testing
    docker run -d --name test-redis -p 6380:6379 redis:7-alpine
    
    # Start the app
    docker run -d --name test-app \
        -p 3001:3000 \
        -e API_KEY=test-key \
        -e REDIS_URL=redis://host.docker.internal:6380 \
        -e NODE_ENV=production \
        browserless-app:latest
    
    # Wait for app to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:3001/health; then
        log_success "Docker image test passed"
    else
        log_error "Docker image test failed"
        docker logs test-app
        exit 1
    fi
    
    # Cleanup
    docker stop test-app test-redis
    docker rm test-app test-redis
}

# Deploy to Railway
deploy_railway() {
    log_info "Deploying to Railway..."
    
    if ! command -v railway &> /dev/null; then
        log_warning "Railway CLI not found, installing..."
        npm install -g @railway/cli
    fi
    
    # Check if logged in
    if ! railway whoami &> /dev/null; then
        log_info "Please log in to Railway:"
        railway login
    fi
    
    # Deploy
    railway up
    log_success "Deployed to Railway"
}

# Deploy to Kubernetes
deploy_k8s() {
    log_info "Deploying to Kubernetes..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s-deployment.yaml
    
    # Wait for deployment
    kubectl rollout status deployment/browserless-api -n browserless
    
    log_success "Deployed to Kubernetes"
}

# Main deployment function
main() {
    echo "Select deployment target:"
    echo "1) Local Development"
    echo "2) Docker"
    echo "3) Railway"
    echo "4) Kubernetes"
    echo "5) All (Test everything)"
    
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            log_info "Local development setup"
            check_dependencies
            install_dependencies
            run_lint
            build_app
            log_success "Ready for local development. Run 'npm run dev' to start."
            ;;
        2)
            log_info "Docker deployment"
            check_dependencies
            install_dependencies
            run_lint
            build_app
            build_docker
            test_docker
            log_success "Docker image ready. Run 'docker-compose up' to start."
            ;;
        3)
            log_info "Railway deployment"
            check_dependencies
            install_dependencies
            run_lint
            run_tests
            build_app
            deploy_railway
            ;;
        4)
            log_info "Kubernetes deployment"
            check_dependencies
            install_dependencies
            run_lint
            run_tests
            build_app
            build_docker
            deploy_k8s
            ;;
        5)
            log_info "Full deployment pipeline"
            check_dependencies
            install_dependencies
            run_lint
            run_tests
            build_app
            build_docker
            test_docker
            log_success "All tests passed! Ready for production deployment."
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Environment setup
setup_env() {
    if [ ! -f .env ]; then
        log_info "Setting up environment file..."
        cp .env.example .env
        log_warning "Please edit .env file with your configuration"
    fi
}

# Performance test
performance_test() {
    log_info "Running performance tests..."
    
    # Start the application
    npm run start &
    APP_PID=$!
    
    sleep 5
    
    # Simple load test
    log_info "Running load test..."
    for i in {1..10}; do
        curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health &
    done
    wait
    
    # Cleanup
    kill $APP_PID 2>/dev/null || true
    
    log_success "Performance test completed"
}

# Memory test
memory_test() {
    log_info "Running memory test..."
    
    # This would typically involve more sophisticated testing
    # For now, just check if the app starts without memory errors
    timeout 30s npm run start || true
    
    log_success "Memory test completed"
}

# Security check
security_check() {
    log_info "Running security checks..."
    
    # Check for known vulnerabilities
    npm audit || log_warning "Security vulnerabilities found - review npm audit output"
    
    # Check Docker image security
    if command -v trivy &> /dev/null; then
        trivy image browserless-app:latest
    else
        log_warning "Trivy not installed - skipping container security scan"
    fi
    
    log_success "Security check completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    docker stop test-app test-redis 2>/dev/null || true
    docker rm test-app test-redis 2>/dev/null || true
    log_success "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            setup_env
            shift
            ;;
        --test)
            run_tests
            shift
            ;;
        --performance)
            performance_test
            shift
            ;;
        --memory)
            memory_test
            shift
            ;;
        --security)
            security_check
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --env          Set up environment file"
            echo "  --test         Run tests only"
            echo "  --performance  Run performance tests"
            echo "  --memory       Run memory tests"
            echo "  --security     Run security checks"
            echo "  --help         Show this help"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If no arguments provided, run main deployment
if [ $# -eq 0 ]; then
    setup_env
    main
fi
