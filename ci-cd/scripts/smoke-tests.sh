#!/bin/bash

# Smoke Tests for E-commerce Platform
# Basic health checks for deployed services

set -e

ENVIRONMENT=${1:-"staging"}
MAX_RETRIES=30
RETRY_INTERVAL=10

# Configuration based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://api.ecommerce-prod.com"
    NAMESPACE="ecommerce-prod"
else
    BASE_URL="https://api.ecommerce-staging.com"
    NAMESPACE="ecommerce-staging"
fi

echo "🧪 Running smoke tests for $ENVIRONMENT environment"
echo "Base URL: $BASE_URL"

# Function to check HTTP endpoint
check_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local retries=0
    
    echo "Checking $endpoint..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint"); then
            if [ "$response" = "$expected_status" ]; then
                echo "✅ $endpoint returned $response"
                return 0
            fi
        fi
        
        retries=$((retries + 1))
        echo "Attempt $retries/$MAX_RETRIES failed. Retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
    
    echo "❌ $endpoint failed after $MAX_RETRIES attempts"
    return 1
}

# Function to check Kubernetes deployment
check_k8s_deployment() {
    local deployment=$1
    
    echo "Checking Kubernetes deployment: $deployment"
    
    if kubectl get deployment "$deployment" -n "$NAMESPACE" >/dev/null 2>&1; then
        local ready_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
        local desired_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        
        if [ "$ready_replicas" = "$desired_replicas" ] && [ "$ready_replicas" -gt 0 ]; then
            echo "✅ Deployment $deployment is ready ($ready_replicas/$desired_replicas)"
            return 0
        else
            echo "❌ Deployment $deployment is not ready ($ready_replicas/$desired_replicas)"
            return 1
        fi
    else
        echo "❌ Deployment $deployment not found"
        return 1
    fi
}

# Main test suite
run_smoke_tests() {
    local failed_tests=0
    
    echo "🔍 Starting health checks..."
    
    # API Gateway health check
    if ! check_endpoint "/health"; then
        failed_tests=$((failed_tests + 1))
    fi
    
    # Product Service
    if ! check_endpoint "/api/products/health"; then
        failed_tests=$((failed_tests + 1))
    fi
    
    # Cart Service
    if ! check_endpoint "/api/cart/health"; then
        failed_tests=$((failed_tests + 1))
    fi
    
    # User Service
    if ! check_endpoint "/api/users/health"; then
        failed_tests=$((failed_tests + 1))
    fi
    
    # Search Service
    if ! check_endpoint "/api/search/health"; then
        failed_tests=$((failed_tests + 1))
    fi
    
    # Frontend
    if ! check_endpoint "/"; then
        failed_tests=$((failed_tests + 1))
    fi
    
    # Check Kubernetes deployments if kubectl is available
    if command -v kubectl >/dev/null 2>&1; then
        echo "🎯 Checking Kubernetes deployments..."
        
        for deployment in product-service cart-service user-service search-service frontend; do
            if ! check_k8s_deployment "$deployment"; then
                failed_tests=$((failed_tests + 1))
            fi
        done
    fi
    
    # Summary
    if [ $failed_tests -eq 0 ]; then
        echo "🎉 All smoke tests passed!"
        return 0
    else
        echo "❌ $failed_tests smoke tests failed"
        return 1
    fi
}

# Run the tests
run_smoke_tests