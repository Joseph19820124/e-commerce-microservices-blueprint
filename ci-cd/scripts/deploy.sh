#!/bin/bash

# Deployment Script for E-commerce Platform
# Handles deployment to different environments

set -e

# Configuration
ENVIRONMENT=${1:-"staging"}
IMAGE_TAG=${2:-"latest"}
NAMESPACE="ecommerce"
REGISTRY="ghcr.io"
REPO_NAME="ecommerce-microservices-blueprint"

# Environment-specific configuration
case $ENVIRONMENT in
    "production"|"prod")
        NAMESPACE="ecommerce-prod"
        ENVIRONMENT="production"
        ;;
    "staging"|"stage")
        NAMESPACE="ecommerce-staging"  
        ENVIRONMENT="staging"
        ;;
    "development"|"dev")
        NAMESPACE="ecommerce-dev"
        ENVIRONMENT="development"
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "Usage: $0 [staging|production|development] [image-tag]"
        exit 1
        ;;
esac

echo "🚀 Deploying E-commerce Platform"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Image Tag: $IMAGE_TAG"

# Function to update image tags in Kubernetes manifests
update_image_tags() {
    local manifest_dir="infrastructure/kubernetes"
    local temp_dir="temp-manifests"
    
    echo "📝 Updating image tags..."
    
    # Create temporary directory for modified manifests
    rm -rf $temp_dir
    cp -r $manifest_dir $temp_dir
    
    # Update image tags in service manifests
    find $temp_dir -name "*.yaml" -type f -exec sed -i.bak \
        -e "s|image: .*ecommerce-.*:.*|image: $REGISTRY/$REPO_NAME/&:$IMAGE_TAG|g" \
        -e "s|:latest|:$IMAGE_TAG|g" {} \;
    
    # Clean up backup files
    find $temp_dir -name "*.bak" -delete
    
    echo "✅ Image tags updated"
}

# Function to apply Kubernetes manifests
apply_manifests() {
    local manifest_dir="temp-manifests"
    
    echo "📋 Applying Kubernetes manifests..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespace
    kubectl label namespace $NAMESPACE environment=$ENVIRONMENT --overwrite
    
    # Apply manifests in order
    echo "Creating secrets..."
    kubectl apply -f $manifest_dir/secrets/ -n $NAMESPACE
    
    echo "Setting up databases..."
    kubectl apply -f $manifest_dir/databases/ -n $NAMESPACE
    
    echo "Deploying services..."
    kubectl apply -f $manifest_dir/services/ -n $NAMESPACE
    
    echo "Configuring ingress..."
    kubectl apply -f $manifest_dir/ingress/ -n $NAMESPACE || echo "⚠️  Ingress configuration skipped"
    
    echo "✅ Manifests applied successfully"
}

# Function to wait for deployments
wait_for_deployments() {
    local services=("product-service" "cart-service" "user-service" "search-service" "frontend")
    
    echo "⏳ Waiting for deployments to be ready..."
    
    for service in "${services[@]}"; do
        echo "Waiting for $service..."
        kubectl rollout status deployment/$service -n $NAMESPACE --timeout=600s
    done
    
    echo "✅ All deployments are ready"
}

# Function to run health checks
run_health_checks() {
    echo "🏥 Running health checks..."
    
    # Wait a bit for services to fully start
    sleep 30
    
    # Run smoke tests
    if [ -f "ci-cd/scripts/smoke-tests.sh" ]; then
        ./ci-cd/scripts/smoke-tests.sh $ENVIRONMENT
    else
        echo "⚠️  Smoke tests not found, skipping..."
    fi
}

# Function to cleanup on failure
cleanup_on_failure() {
    echo "🧹 Cleaning up failed deployment..."
    
    # Rollback deployments
    local services=("product-service" "cart-service" "user-service" "search-service" "frontend")
    
    for service in "${services[@]}"; do
        if kubectl get deployment/$service -n $NAMESPACE >/dev/null 2>&1; then
            echo "Rolling back $service..."
            kubectl rollout undo deployment/$service -n $NAMESPACE || echo "⚠️  Rollback failed for $service"
        fi
    done
    
    # Clean up temporary files
    rm -rf temp-manifests
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    echo "📢 Notification: $status - $message"
    
    # Slack notification (if webhook URL is configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"E-commerce Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || echo "⚠️  Failed to send Slack notification"
    fi
    
    # Email notification (if configured)
    if [ -n "$EMAIL_NOTIFICATION" ] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "E-commerce Deployment $status" "$EMAIL_NOTIFICATION" || echo "⚠️  Failed to send email notification"
    fi
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    echo "🚀 Starting deployment process..."
    
    # Pre-deployment checks
    if ! kubectl cluster-info >/dev/null 2>&1; then
        echo "❌ Cannot connect to Kubernetes cluster"
		exit 1
    fi
    
    # Set trap for cleanup on failure
    trap cleanup_on_failure ERR
    
    # Deployment steps
    update_image_tags
    apply_manifests
    wait_for_deployments
    run_health_checks
    
    # Clean up temporary files
    rm -rf temp-manifests
    
    # Calculate deployment time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo "🎉 Deployment completed successfully!"
    echo "Environment: $ENVIRONMENT"
    echo "Duration: ${duration}s"
    
    # Send success notification
    send_notification "SUCCESS" "E-commerce platform deployed to $ENVIRONMENT in ${duration}s"
    
    # Show service information
    echo ""
    echo "📋 Deployed Services:"
    kubectl get pods -n $NAMESPACE
    echo ""
    kubectl get services -n $NAMESPACE
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <environment> [image-tag]"
    echo ""
    echo "Environments:"
    echo "  staging     - Deploy to staging environment"
    echo "  production  - Deploy to production environment  "
    echo "  development - Deploy to development environment"
    echo ""
    echo "Examples:"
    echo "  $0 staging latest"
    echo "  $0 production v1.2.3"
    echo "  $0 development feature-branch"
    exit 1
fi

# Run main deployment
main "$@"