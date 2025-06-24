#!/bin/bash

# E-commerce Microservices Minikube Setup Script
# This script sets up a local Kubernetes cluster using minikube for development

set -e

echo "🚀 Setting up E-commerce Microservices Kubernetes Environment"

# Check if minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "❌ minikube is not installed. Please install minikube first."
    echo "Visit: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    echo "Visit: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Start minikube with recommended settings for development
echo "📦 Starting minikube cluster..."
minikube start \
    --driver=docker \
    --cpus=4 \
    --memory=8192 \
    --disk-size=50g \
    --kubernetes-version=v1.28.0 \
    --addons=ingress,dashboard,metrics-server,storage-provisioner

# Enable required addons
echo "🔧 Enabling minikube addons..."
minikube addons enable ingress
minikube addons enable dashboard
minikube addons enable metrics-server

# Verify cluster is running
echo "✅ Verifying cluster status..."
kubectl cluster-info

# Create namespaces
echo "📁 Creating namespaces..."
kubectl apply -f namespaces/

# Create secrets
echo "🔐 Creating secrets..."
kubectl apply -f secrets/

# Deploy databases
echo "🗄️ Deploying databases..."
kubectl apply -f databases/

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
kubectl wait --for=condition=ready pod -l app=mongodb -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch -n ecommerce --timeout=300s

# Get minikube IP
MINIKUBE_IP=$(minikube ip)

echo "✅ Kubernetes environment setup completed!"
echo ""
echo "📋 Cluster Information:"
echo "  Minikube IP: $MINIKUBE_IP"
echo "  Dashboard: minikube dashboard"
echo "  Kubectl context: $(kubectl config current-context)"
echo ""
echo "🌐 Service Access:"
echo "  MongoDB: $MINIKUBE_IP:27017"
echo "  PostgreSQL: $MINIKUBE_IP:5432"
echo "  Redis: $MINIKUBE_IP:6379"
echo "  Elasticsearch: $MINIKUBE_IP:9200"
echo "  Kibana: $MINIKUBE_IP:5601"
echo ""
echo "🔧 Useful Commands:"
echo "  kubectl get pods -n ecommerce"
echo "  kubectl get services -n ecommerce"
echo "  kubectl logs -f <pod-name> -n ecommerce"
echo "  minikube dashboard"
echo "  minikube service list"
echo ""
echo "🎯 Next Steps:"
echo "  1. Deploy microservices: kubectl apply -f services/"
echo "  2. Set up ingress: kubectl apply -f ingress/"
echo "  3. Access applications via minikube tunnel or port-forward"