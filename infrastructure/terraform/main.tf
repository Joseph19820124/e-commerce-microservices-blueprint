# Main Terraform configuration for E-commerce Microservices

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }

  backend "s3" {
    bucket         = "ecommerce-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.team_name
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values
locals {
  cluster_name = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.team_name
  }
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  
  availability_zones     = data.aws_availability_zones.available.names
  private_subnet_cidrs   = var.private_subnet_cidrs
  public_subnet_cidrs    = var.public_subnet_cidrs
  database_subnet_cidrs  = var.database_subnet_cidrs
  
  enable_nat_gateway = var.enable_nat_gateway
  enable_vpn_gateway = var.enable_vpn_gateway
  
  tags = local.common_tags
}

# Security Module
module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  
  allowed_cidr_blocks = var.allowed_cidr_blocks
  
  tags = local.common_tags
}

# Database Module
module "database" {
  source = "./modules/database"

  project_name = var.project_name
  environment  = var.environment
  
  vpc_id               = module.networking.vpc_id
  database_subnet_ids  = module.networking.database_subnet_ids
  security_group_ids   = [module.security.database_security_group_id]
  
  # MongoDB Configuration
  mongodb_instance_class = var.mongodb_instance_class
  mongodb_storage_size   = var.mongodb_storage_size
  
  # Redis Configuration
  redis_node_type = var.redis_node_type
  redis_num_nodes = var.redis_num_nodes
  
  # PostgreSQL Configuration
  postgres_instance_class = var.postgres_instance_class
  postgres_storage_size   = var.postgres_storage_size
  postgres_username       = var.postgres_username
  postgres_password       = var.postgres_password
  
  # Elasticsearch Configuration
  elasticsearch_instance_type = var.elasticsearch_instance_type
  elasticsearch_instance_count = var.elasticsearch_instance_count
  
  tags = local.common_tags
}

# Compute Module (EKS)
module "compute" {
  source = "./modules/compute"

  project_name = var.project_name
  environment  = var.environment
  
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  
  cluster_version = var.kubernetes_version
  
  # Node Groups Configuration
  node_groups = var.node_groups
  
  # IAM Roles
  cluster_service_role_arn = module.security.eks_cluster_role_arn
  node_instance_role_arn   = module.security.eks_node_role_arn
  
  tags = local.common_tags
  
  depends_on = [module.networking, module.security]
}

# Storage Module
module "storage" {
  source = "./modules/storage"

  project_name = var.project_name
  environment  = var.environment
  
  # S3 Buckets
  create_app_bucket     = var.create_app_bucket
  create_backup_bucket  = var.create_backup_bucket
  create_logs_bucket    = var.create_logs_bucket
  
  # EBS Volumes
  ebs_volumes = var.ebs_volumes
  
  tags = local.common_tags
}

# Configure Kubernetes Provider
provider "kubernetes" {
  host                   = module.compute.cluster_endpoint
  cluster_ca_certificate = base64decode(module.compute.cluster_ca_certificate)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.compute.cluster_name]
  }
}

# Configure Helm Provider
provider "helm" {
  kubernetes {
    host                   = module.compute.cluster_endpoint
    cluster_ca_certificate = base64decode(module.compute.cluster_ca_certificate)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.compute.cluster_name]
    }
  }
}

# Install essential Helm charts
resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"

  set {
    name  = "clusterName"
    value = module.compute.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "false"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  depends_on = [module.compute]
}

resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"

  depends_on = [module.compute]
}

resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"

  set {
    name  = "awsRegion"
    value = var.aws_region
  }

  set {
    name  = "autoDiscovery.clusterName"
    value = module.compute.cluster_name
  }

  depends_on = [module.compute]
}