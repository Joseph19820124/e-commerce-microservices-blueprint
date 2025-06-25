# Variables for E-commerce Microservices Infrastructure

# General Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ecommerce"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "team_name" {
  description = "Name of the team managing this infrastructure"
  type        = string
  default     = "platform-team"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the infrastructure"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.27"
}

variable "node_groups" {
  description = "Configuration for EKS node groups"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    disk_size      = number
    desired_size   = number
    max_size       = number
    min_size       = number
    labels         = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.medium", "t3.large"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
      desired_size   = 3
      max_size       = 10
      min_size       = 1
      labels = {
        role = "general"
      }
      taints = []
    }
    compute = {
      instance_types = ["c5.large", "c5.xlarge"]
      capacity_type  = "SPOT"
      disk_size      = 100
      desired_size   = 2
      max_size       = 20
      min_size       = 0
      labels = {
        role = "compute"
      }
      taints = [{
        key    = "workload-type"
        value  = "compute"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

# Database Configuration
variable "mongodb_instance_class" {
  description = "MongoDB instance class"
  type        = string
  default     = "t3.medium"
}

variable "mongodb_storage_size" {
  description = "MongoDB storage size in GB"
  type        = number
  default     = 100
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type        = number
  default     = 2
}

variable "postgres_instance_class" {
  description = "PostgreSQL instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "postgres_storage_size" {
  description = "PostgreSQL storage size in GB"
  type        = number
  default     = 20
}

variable "postgres_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "postgres_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "elasticsearch_instance_type" {
  description = "Elasticsearch instance type"
  type        = string
  default     = "t3.small.elasticsearch"
}

variable "elasticsearch_instance_count" {
  description = "Number of Elasticsearch instances"
  type        = number
  default     = 2
}

# Storage Configuration
variable "create_app_bucket" {
  description = "Create S3 bucket for application data"
  type        = bool
  default     = true
}

variable "create_backup_bucket" {
  description = "Create S3 bucket for backups"
  type        = bool
  default     = true
}

variable "create_logs_bucket" {
  description = "Create S3 bucket for logs"
  type        = bool
  default     = true
}

variable "ebs_volumes" {
  description = "EBS volumes to create"
  type = map(object({
    size              = number
    type              = string
    availability_zone = string
    encrypted         = bool
  }))
  default = {
    mongodb-data = {
      size              = 100
      type              = "gp3"
      availability_zone = "us-east-1a"
      encrypted         = true
    }
    elasticsearch-data = {
      size              = 50
      type              = "gp3"
      availability_zone = "us-east-1b"
      encrypted         = true
    }
  }
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus, Grafana)"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable logging stack (ELK)"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# SSL Configuration
variable "enable_ssl" {
  description = "Enable SSL/TLS"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "ecommerce.local"
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "auto_scaling_enabled" {
  description = "Enable auto scaling for worker nodes"
  type        = bool
  default     = true
}

# Development specific variables
variable "enable_dev_tools" {
  description = "Enable development tools (only for dev environment)"
  type        = bool
  default     = false
}

variable "allow_ssh_access" {
  description = "Allow SSH access to worker nodes (only for dev environment)"
  type        = bool
  default     = false
}